/**
 * Standalone Express server for the call-processor pipeline.
 * Run with: npx tsx backend/server.ts
 */
import express from "express";
import cors from "cors";
import { connectDB } from "./db.js";
import callProcessorRoutes from "./routes/callProcessorRoutes.js";
import { startAutoPolling } from "./services/scheduler.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

import contactRoutes from "./routes/contactRoutes.js";

// Mount all call-processor routes under /api
app.use("/api", callProcessorRoutes);
app.use("/api/contacts", contactRoutes);

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
