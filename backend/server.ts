/**
 * Standalone Express server for the call-processor pipeline.
 * Run with: npx tsx backend/server.ts
 */
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import callProcessorRoutes from "./routes/callProcessorRoutes.js";
import { processNewCalls } from "./services/callProcessor.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = 5000;
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

app.use(cors());
app.use(express.json());

// Mount all call-processor routes under /api
app.use("/api", callProcessorRoutes);

/**
 * Auto-poll: process new Bolna calls every 5 minutes.
 */
function startAutoPolling() {
    // Run once immediately on startup
    processNewCalls()
        .then((r) => console.log(`[AutoPoll] Initial run — ${r.processed} processed, ${r.failed} failed out of ${r.total}`))
        .catch((err) => console.error("[AutoPoll] Initial run error:", err));

    // Then repeat every 5 minutes
    setInterval(async () => {
        try {
            const result = await processNewCalls();
            console.log(`[AutoPoll] ${result.processed} processed, ${result.failed} failed out of ${result.total}`);
        } catch (err) {
            console.error("[AutoPoll] Error:", err);
        }
    }, POLL_INTERVAL_MS);

    console.log(`[AutoPoll] Polling every ${POLL_INTERVAL_MS / 1000}s`);
}

async function start() {
    await connectDB();
    const server = app.listen(PORT, () => {
        console.log(`[Backend] Call processor API running on http://localhost:${PORT}`);
        startAutoPolling();
    });
    server.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
            console.error(`[Backend] Port ${PORT} is already in use. Kill the old process or use a different port.`);
        } else {
            console.error("[Backend] Server error:", err);
        }
        process.exit(1);
    });
}

start().catch(console.error);
