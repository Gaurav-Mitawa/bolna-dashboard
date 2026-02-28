import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import session from "express-session";
import MongoStore from "connect-mongo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env before other imports
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { connectDB } from "./db.js";
import { startAutoPolling } from "./services/scheduler.js";

// Route imports
import authRoutes from "./routes/authRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import callProcessorRoutes from "./routes/callProcessorRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import crmRoutes from "./routes/crmRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import bolnaRoutes from "./routes/bolnaRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import setupRoutes from "./routes/setupRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import demoRoutes from "./routes/demoRoutes.js";

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || "5000", 10);
const MONGO_URI = process.env.MONGODB_URI || "";

// Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toLocaleTimeString()} [express] ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || "dev-secret-bolna",
        resave: false,
        saveUninitialized: false,
        store: MONGO_URI ? MongoStore.create({ mongoUrl: MONGO_URI }) : undefined,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        },
    })
);

// Passport initialization
import passportInstance from "./config/passport.js";
app.use(passportInstance.initialize());
app.use(passportInstance.session());

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/bolna", bolnaRoutes);
app.use("/api/subscribe", subscriptionRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/setup-api", setupRoutes);
app.use("/api/demo", demoRoutes);

// Webhook route needs raw body for Razorpay HMAC verification
app.use(
    "/api/webhooks",
    express.raw({ type: "application/json" }),
    webhookRoutes
);

app.use("/api", callProcessorRoutes);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[Error] ${err.stack || err.message || err}`);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message
    });
});

async function start() {
    try {
        await connectDB();

        // Serve frontend
        if (process.env.NODE_ENV === "production") {
            const { serveStatic } = await import("../server/static.js");
            serveStatic(app);
        } else {
            const { setupVite } = await import("../server/vite.js");
            await setupVite(httpServer, app);
        }

        httpServer.listen({ port: PORT, host: "0.0.0.0" }, () => {
            console.log(`[Backend] Unified server running on http://localhost:${PORT}`);
            startAutoPolling();
        });

        httpServer.on("error", (err: any) => {
            if (err.code === "EADDRINUSE") {
                console.error(`[Backend] Port ${PORT} is already in use.`);
            } else {
                console.error("[Backend] Server error:", err);
            }
            process.exit(1);
        });
    } catch (err) {
        console.error("[Backend] Failed to start:", err);
        process.exit(1);
    }
}

start().catch(console.error);
