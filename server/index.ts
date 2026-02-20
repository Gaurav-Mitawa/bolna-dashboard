import express, { type Request, Response, NextFunction } from "express";
// Drizzle/Neon routes removed - all API handled by FastAPI backend
// import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
// Using http-proxy-middleware v3 syntax
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Body parsing middleware
// IMPORTANT: We need to parse JSON for our own routes, but NOT for proxy routes
// because http-proxy-middleware needs the raw body stream
app.use((req, res, next) => {
  // Skip body parsing for proxy routes - let the proxy handle it
  if (req.path.startsWith("/api/agents") ||
    req.path.startsWith("/api/analytics") ||
    // req.path.startsWith("/api/vapi") ||
    req.path.startsWith("/api/chat") ||
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/webhooks")) {
    return next();
  }
  // For other routes, use express.json()
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })(req, res, next);
});

app.use((req, res, next) => {
  // Skip urlencoded parsing for proxy routes
  if (req.path.startsWith("/api/agents") ||
    req.path.startsWith("/api/analytics") ||
    // req.path.startsWith("/api/vapi") ||
    req.path.startsWith("/api/chat") ||
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/webhooks")) {
    return next();
  }
  express.urlencoded({ extended: false })(req, res, next);
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // ─── Call Processor Pipeline (MongoDB + DeepSeek) ───
  const { connectDB } = await import("../backend/db.js");
  const callProcessorRoutes = (await import("../backend/routes/callProcessorRoutes.js")).default;
  await connectDB();

  // Start the background poller
  const { startAutoPolling } = await import("../backend/services/scheduler.js");
  startAutoPolling();

  app.use("/api", callProcessorRoutes);

  // Proxy API requests to FastAPI backend (port 8000)
  // IMPORTANT: Register these BEFORE registerRoutes to catch FastAPI routes first
  app.use(
    "/api/analytics",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      // CRITICAL: http-proxy-middleware strips the matched prefix (/api/analytics) by default
      // We need to add it back so FastAPI receives the full path /api/analytics/...
      pathRewrite: (path: string, req: any) => {
        // path will be like "/dashboard" (stripped), we need "/api/analytics/dashboard"
        const fullPath = `/api/analytics${path}`;
        console.log(`[PROXY] Path rewrite: ${(req as any).path} -> ${fullPath}`);
        return fullPath;
      },
      // Log proxy requests and responses for debugging
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
          log(`[PROXY] Response ${proxyRes.statusCode} for ${req.path}`, "proxy");
        },
        error: (err: any, req: any, res: any) => {
          log(`[PROXY ERROR] ${(req as any).path}: ${err.message}`, "proxy");
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
    })
  );

  // Also proxy other FastAPI routes (agents, webhooks, etc.)
  // CRITICAL: Must preserve full path /api/agents/... when forwarding
  // IMPORTANT: Use app.use() not app.post() to handle all HTTP methods
  app.use(
    "/api/agents",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      // http-proxy-middleware strips the matched prefix by default
      // We need to add it back: /api/agents/generate -> /api/agents/generate (not just /generate)
      pathRewrite: (path: string, req: any) => {
        // path will be like "/generate" (stripped), we need "/api/agents/generate"
        const fullPath = `/api/agents${path}`;
        console.log(`[PROXY] ${req.method} ${(req as any).path} -> http://localhost:8000${fullPath}`);
        return fullPath;
      },
      // Ensure all HTTP methods are forwarded
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      // CRITICAL: Don't let express.json() consume the body - proxy needs raw body
      // But we already have express.json() above, so we need to handle this carefully
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
          // Body should be automatically forwarded by http-proxy-middleware
          // since we're skipping express.json() for proxy routes
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
          log(`[PROXY] Response ${proxyRes.statusCode} for ${req.method} ${req.path}`, "proxy");
        },
        error: (err: any, req: any, res: any) => {
          log(`[PROXY ERROR] ${(req as any).path}: ${err.message}`, "proxy");
          console.error(`[PROXY ERROR] Full error:`, err);
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
      // Add timeout to prevent hanging
      timeout: 60000, // 60 seconds
      proxyTimeout: 60000,
    })
  );

  // Proxy VAPI integration routes
  app.use(
    "/api/vapi",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string, req: any) => {
        // path will be like "/agents" (stripped), we need "/api/vapi/agents"
        const fullPath = `/api/vapi${path}`;
        console.log(`[PROXY] ${req.method} ${(req as any).path} -> http://localhost:8000${fullPath}`);
        return fullPath;
      },
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
          log(`[PROXY] Response ${proxyRes.statusCode} for ${req.method} ${req.path}`, "proxy");
        },
        error: (err: any, req: any, res: any) => {
          log(`[PROXY ERROR] ${(req as any).path}: ${err.message}`, "proxy");
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
    })
  );

  // Proxy Chat API routes
  app.use(
    "/api/chat",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string, req: any) => {
        const fullPath = `/api/chat${path}`;
        console.log(`[PROXY] ${req.method} ${(req as any).path} -> http://localhost:8000${fullPath}`);
        return fullPath;
      },
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
          log(`[PROXY] Response ${proxyRes.statusCode} for ${req.method} ${req.path}`, "proxy");
        },
        error: (err: any, req: any, res: any) => {
          log(`[PROXY ERROR] ${(req as any).path}: ${err.message}`, "proxy");
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
    })
  );

  // Mount Contact Routes (Node.js/Express handling MongoDB)
  const contactRoutes = (await import("../backend/routes/contactRoutes.js")).default;
  app.use("/api/contacts", contactRoutes);

  // Proxy Auth API routes (CRITICAL: Must be before other /api routes)
  app.use(
    "/api/auth",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string, req: any) => {
        const fullPath = `/api/auth${path}`;
        console.log(`[PROXY] ${req.method} ${(req as any).path} -> http://localhost:8000${fullPath}`);
        return fullPath;
      },
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
        },
        proxyRes: (proxyRes: any, req: any, res: any) => {
          log(`[PROXY] Response ${proxyRes.statusCode} for ${req.method} ${req.path}`, "proxy");
        },
        error: (err: any, req: any, res: any) => {
          log(`[PROXY ERROR] ${(req as any).path}: ${err.message}`, "proxy");
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
    })
  );

  app.use(
    "/webhooks",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq: any, req: any, res: any) => {
          log(`[PROXY] ${req.method} ${(req as any).path} -> FastAPI backend`, "proxy");
        },
      },
    })
  );

  // Drizzle/Neon routes removed - all API handled by FastAPI backend
  // await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
