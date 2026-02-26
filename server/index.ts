import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { serveStatic } from "./static";

dotenv.config();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

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
  // ─── Connect to MongoDB ───────────────────────────────────────────────────
  const { connectDB } = await import("../backend/db.js");
  await connectDB();

  const MONGO_URI = process.env.MONGODB_URI || "";

  // ─── Session middleware (MUST be before passport) ─────────────────────────
  app.set("trust proxy", 1); // Trust first proxy (required for Render/DigitalOcean HTTPS)
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
      resave: false,
      saveUninitialized: false,
      store: MONGO_URI
        ? MongoStore.create({ mongoUrl: MONGO_URI })
        : undefined,
      cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  // ─── Passport (Google OAuth) ──────────────────────────────────────────────
  const passportModule = await import("../backend/config/passport.js");
  const passport = passportModule.default;
  app.use(passport.initialize());
  app.use(passport.session());

  // ─── CRITICAL: Webhook route needs raw body for Razorpay HMAC verification ─
  // Must be registered BEFORE express.json()
  const webhookRoutes = (await import("../backend/routes/webhookRoutes.js")).default;
  app.use(
    "/api/webhooks",
    express.raw({ type: "application/json" }),
    webhookRoutes
  );

  // ─── Body parsing for all other routes ───────────────────────────────────
  // Skip proxy routes — http-proxy-middleware needs raw body stream
  app.use((req, res, next) => {
    if (
      req.path.startsWith("/api/agents") ||
      req.path.startsWith("/api/analytics") ||
      req.path.startsWith("/api/chat") ||
      req.path.startsWith("/api/vapi") ||
      req.path.startsWith("/webhooks")
    ) {
      return next();
    }
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })(req, res, next);
  });

  app.use((req, res, next) => {
    if (
      req.path.startsWith("/api/agents") ||
      req.path.startsWith("/api/analytics") ||
      req.path.startsWith("/api/chat") ||
      req.path.startsWith("/api/vapi") ||
      req.path.startsWith("/webhooks")
    ) {
      return next();
    }
    express.urlencoded({ extended: false })(req, res, next);
  });

  // ─── SOP: Node.js Auth Routes (replaces FastAPI proxy for /api/auth) ──────
  const authRoutes = (await import("../backend/routes/authRoutes.js")).default;
  app.use("/api/auth", authRoutes);

  // ─── Health check — visit /api/health to diagnose DB connectivity ─────────
  app.get("/api/health", (_req, res) => {
    const states: Record<number, string> = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
    res.json({
      status: "ok",
      db: states[mongoose.connection.readyState] ?? "unknown",
      mongoUri: process.env.MONGODB_URI ? "set" : "MISSING",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── SOP: Bolna API Key Setup ─────────────────────────────────────────────
  const setupRoutes = (await import("../backend/routes/setupRoutes.js")).default;
  app.use("/api/setup-api", setupRoutes);

  // ─── SOP: Settings ────────────────────────────────────────────────────────
  const settingsRoutes = (await import("../backend/routes/settingsRoutes.js")).default;
  app.use("/api/settings", settingsRoutes);

  // ─── SOP: Subscription (Razorpay) ────────────────────────────────────────
  const subscriptionRoutes = (await import("../backend/routes/subscriptionRoutes.js")).default;
  app.use("/api/subscribe", subscriptionRoutes);

  // ─── SOP: CRM ─────────────────────────────────────────────────────────────
  const crmRoutes = (await import("../backend/routes/crmRoutes.js")).default;
  app.use("/api/crm", crmRoutes);

  // ─── SOP: Campaigns ───────────────────────────────────────────────────────
  const campaignRoutes = (await import("../backend/routes/campaignRoutes.js")).default;
  app.use("/api/campaigns", campaignRoutes);

  // ─── SOP: Bolna Agent/Phone Number Proxy ─────────────────────────────────
  const bolnaRoutes = (await import("../backend/routes/bolnaRoutes.js")).default;
  app.use("/api/bolna", bolnaRoutes);

  // ─── SOP: Dashboard ───────────────────────────────────────────────────────
  const dashboardRoutes = (await import("../backend/routes/dashboardRoutes.js")).default;
  app.use("/api/dashboard", dashboardRoutes);

  // ─── Existing: Call Processor Pipeline ───────────────────────────────────
  const callProcessorRoutes = (await import("../backend/routes/callProcessorRoutes.js")).default;
  app.use("/api", callProcessorRoutes);

  // Start the background poller (existing pipeline, uses BOLNA_API_KEY env var)
  const { startAutoPolling } = await import("../backend/services/scheduler.js");
  startAutoPolling();

  // ─── Existing: Contact Routes (call-history contacts) ─────────────────────
  const contactRoutes = (await import("../backend/routes/contactRoutes.js")).default;
  app.use("/api/contacts", contactRoutes);

  // ─── FastAPI Proxy Routes ─────────────────────────────────────────────────
  // NOTE: /api/auth is now handled by Node.js above, NOT proxied to FastAPI
  app.use(
    "/api/analytics",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string) => `/api/analytics${path}`,
      on: {
        proxyReq: (proxyReq: any, req: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
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
    "/api/agents",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string) => `/api/agents${path}`,
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      on: {
        proxyReq: (proxyReq: any, req: any) => {
          log(`[PROXY] ${req.method} ${req.path} -> http://localhost:8000${proxyReq.path}`, "proxy");
        },
        error: (err: any, req: any, res: any) => {
          log(`[PROXY ERROR] ${(req as any).path}: ${err.message}`, "proxy");
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
      timeout: 60000,
      proxyTimeout: 60000,
    })
  );

  app.use(
    "/api/vapi",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string) => `/api/vapi${path}`,
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      on: {
        error: (err: any, req: any, res: any) => {
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
    })
  );

  app.use(
    "/api/chat",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      pathRewrite: (path: string) => `/api/chat${path}`,
      // @ts-ignore
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      on: {
        error: (err: any, req: any, res: any) => {
          if (!res.headersSent) {
            res.status(502).json({ error: "Backend server unavailable", details: err.message });
          }
        },
      },
    })
  );

  // Legacy /webhooks proxy (Bolna/other webhooks NOT Razorpay — Razorpay is /api/webhooks above)
  app.use(
    "/webhooks",
    createProxyMiddleware({
      target: "http://localhost:8000",
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq: any, req: any) => {
          log(`[PROXY] ${req.method} ${(req as any).path} -> FastAPI backend`, "proxy");
        },
      },
    })
  );

  // ─── Global error handler ─────────────────────────────────────────────────
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  });

  // ─── Serve frontend ───────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0" }, () => {
    log(`serving on port ${port}`);
  });
})();
