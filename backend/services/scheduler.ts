
import { processNewCalls } from "./callProcessor.js";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startAutoPolling() {
    console.log(`[AutoPoll] Starting polling every ${POLL_INTERVAL_MS / 1000}s`);

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
}
