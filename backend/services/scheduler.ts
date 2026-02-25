import { processNewCalls } from "./callProcessor.js";
import { User } from "../models/User.js";
import { getApiKey } from "./bolnaService.js";
import { syncBolnaToCrm } from "./crmSyncService.js";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function processAllUsers() {
    try {
        // Only poll for users with an API key AND an active subscription
        const users = await User.find({
            bolnaApiKey: { $ne: null },
            $or: [
                { subscriptionStatus: "active" },
                { subscriptionStatus: "trial" },
                { trialExpiresAt: { $gt: new Date() } }
            ]
        });
        console.log(`[AutoPoll] Found ${users.length} active subscribers with Bolna API Key.`);

        for (const user of users) {
            try {
                if (!user.bolnaApiKey) continue;
                const apiKey = getApiKey(user.bolnaApiKey);
                if (!apiKey) continue;

                const result = await processNewCalls(user.id, apiKey);
                console.log(`[AutoPoll] User ${user.email} — ${result.processed} processed, ${result.failed} failed out of ${result.total}`);

                // Also sync to CRM Customers
                const syncResult = await syncBolnaToCrm(user);
                console.log(`[AutoPoll] User ${user.email} CRM Sync — Created: ${syncResult.created}, Updated: ${syncResult.updated}`);
            } catch (err: any) {
                console.error(`[AutoPoll] Error processing user ${user.email}:`, err.message);
            }
        }
    } catch (err) {
        console.error("[AutoPoll] Global error:", err);
    }
}

export function startAutoPolling() {
    console.log(`[AutoPoll] Starting polling every ${POLL_INTERVAL_MS / 1000}s`);

    // Run once immediately on startup
    processAllUsers();

    // Then repeat every 15 minutes
    setInterval(processAllUsers, POLL_INTERVAL_MS);
}
