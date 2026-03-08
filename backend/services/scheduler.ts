/**
 * scheduler.ts — Background job runner (Phase 10)
 *
 * Runs the MongoDB-as-SSOT sync poller on a fixed interval.
 * All data reads from Bolna are done here — never in frontend routes.
 */
import { runSyncPoller } from "./syncPoller.js";

const POLLER_INTERVAL_MS = parseInt(
    process.env.POLLER_INTERVAL_MS || "300000",
    10
); // default 5 minutes

export function startAutoPolling() {
    console.log(
        `[Scheduler] Starting sync poller — interval every ${POLLER_INTERVAL_MS / 1000}s`
    );

    // Run immediately on startup (non-blocking)
    runSyncPoller().catch(err =>
        console.error("[Scheduler] Initial poller run failed:", err)
    );

    setInterval(() => {
        runSyncPoller().catch(err =>
            console.error("[Scheduler] Scheduled poller run failed:", err)
        );
    }, POLLER_INTERVAL_MS);
}
