/**
 * syncPoller.ts — MongoDB-as-SSOT Background Poller (Phase 10)
 *
 * Architecture:
 *  1. Sync Bolna agents → MongoDB Agent collection (builds tenant ownership map)
 *  2. Fetch all agents from MongoDB → iterate with userId from Agent doc (never from Bolna)
 *  3. For each agent, fetch executions from Bolna and upsert to Call collection
 *  4. Trigger LLM analysis for any new call that has a transcript and no llm_analysis
 *  5. Sync campaign batch statuses from Bolna → Campaign collection
 *
 * TENANT ISOLATION: The userId on every Call record comes exclusively from the
 * MongoDB Agent document. Bolna API responses never determine which tenant owns a call.
 */

import { Agent } from "../models/Agent.js";
import { Call } from "../models/Call.js";
import { Campaign } from "../models/Campaign.js";
import { User } from "../models/User.js";
import { Contact } from "../models/Contact.js";
import { Customer } from "../models/Customer.js";
import { analyzeTranscript } from "./llmService.js";
import { getApiKey } from "./bolnaService.js";
import { normalizePhone } from "../utils/phoneUtils.js";

const BOLNA_API = "https://api.bolna.ai";
const DELAY_BETWEEN_LLM_MS = 10_000;
const MAX_LLM_PER_RUN = 5;
// A call that fails LLM analysis this many times is permanently skipped (processed=true)
// This prevents a bad/short/garbage transcript from blocking the queue forever.
const MAX_LLM_RETRIES = 3;

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function bolnaGet<T>(endpoint: string, apiKey: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        const res = await fetch(`${BOLNA_API}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Bolna ${res.status}: ${res.statusText}`);
        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

// ─── Bolna types ─────────────────────────────────────────────────────────────

interface BolnaAgent {
    id: string;
    agent_name: string;
    agent_status?: string;
}

interface BolnaExecution {
    id: string;
    agent_id: string;
    batch_id?: string | null;
    status: string;
    conversation_time?: number;
    transcript?: string;
    created_at: string;
    updated_at?: string;
    total_cost?: number;
    cost_breakdown?: {
        llm: number;
        network: number;
        platform: number;
        synthesizer: number;
        transcriber: number;
    };
    extracted_data?: Record<string, any>;
    telephony_data?: {
        to_number?: string;
        from_number?: string;
        call_type?: string;
        recording_url?: string;
    };
}

interface ExecutionsPage {
    data: BolnaExecution[];
    total: number;
    has_more: boolean;
}

// ─── PHASE 1: Sync agents from Bolna → MongoDB Agent collection ───────────────

async function syncAgentsForUser(userId: string, apiKey: string): Promise<void> {
    let bolnaAgents: BolnaAgent[];
    try {
        bolnaAgents = await bolnaGet<BolnaAgent[]>("/v2/agent/all", apiKey);
    } catch (err: any) {
        console.error(`[SyncPoller] Failed to fetch agents for user ${userId}:`, err.message);
        return;
    }

    for (const ba of bolnaAgents) {
        try {
            await Agent.findOneAndUpdate(
                { bolnaAgentId: ba.id },
                {
                    $set: {
                        userId,
                        agentName: ba.agent_name,
                        isActive: true,
                        lastSyncedAt: new Date(),
                    },
                },
                { upsert: true }
            );
        } catch (err: any) {
            console.error(`[SyncPoller] Agent upsert failed for ${ba.id}:`, err.message);
        }
    }
    console.log(`[SyncPoller] Synced ${bolnaAgents.length} agents for user ${userId}`);
}

// ─── PHASE 2: Sync call executions from Bolna → MongoDB Call collection ───────

async function syncCallsForAgent(
    runId: string,
    mongoAgent: { userId: string; bolnaAgentId: string; agentName: string },
    apiKey: string
): Promise<{ checked: number; created: number; updated: number }> {
    let checked = 0, created = 0, updated = 0;
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        let executions: BolnaExecution[];
        let hasMoreFromApi: boolean;

        try {
            const resp = await bolnaGet<ExecutionsPage>(
                `/v2/agent/${mongoAgent.bolnaAgentId}/executions?page_size=50&page_number=${page}`,
                apiKey
            );
            executions = resp.data || [];
            hasMoreFromApi = resp.has_more || false;
            if (!executions.length) hasMoreFromApi = false;
        } catch (err: any) {
            console.error(
                `[SyncPoller][${runId}] Error fetching agent ${mongoAgent.bolnaAgentId} page ${page}:`,
                err.message
            );
            break;
        }

        hasMore = hasMoreFromApi;

        for (const exec of executions) {
            checked++;

            // TENANT RULE: userId always comes from MongoDB Agent doc, never from Bolna
            const userId = mongoAgent.userId;

            if (!userId) {
                console.warn(
                    `[SyncPoller][${runId}] SKIPPED call ${exec.id} — could not determine userId for agent ${mongoAgent.bolnaAgentId}`
                );
                continue;
            }

            const bolnaUpdatedAt = exec.updated_at ? new Date(exec.updated_at) : null;

            // Determine customer phone number
            const direction = exec.telephony_data?.call_type || "outbound";
            let callerNumber = "";
            if (direction === "outbound") {
                callerNumber = exec.telephony_data?.to_number || "";
            } else {
                callerNumber = exec.telephony_data?.from_number || "";
            }
            if (!callerNumber) {
                callerNumber =
                    exec.telephony_data?.from_number ||
                    exec.telephony_data?.to_number ||
                    "";
            }

            // Check if existing record is up-to-date
            const existing = await Call.findOne({ call_id: exec.id });
            if (existing) {
                // If bolna updated_at hasn't changed, skip
                if (
                    bolnaUpdatedAt &&
                    existing.bolna_updated_at &&
                    existing.bolna_updated_at.getTime() >= bolnaUpdatedAt.getTime()
                ) {
                    continue;
                }

                // Update call-data fields — NEVER overwrite userId
                await Call.updateOne(
                    { call_id: exec.id },
                    {
                        $set: {
                            agent_id: exec.agent_id,
                            agent_name: mongoAgent.agentName,
                            batch_id: exec.batch_id || null,
                            caller_number: normalizePhone(callerNumber) || callerNumber,
                            call_duration: exec.conversation_time || 0,
                            call_timestamp: exec.created_at,
                            transcript: exec.transcript || "",
                            call_direction: direction,
                            total_cost: exec.total_cost || 0,
                            cost_breakdown: exec.cost_breakdown || null,
                            recording_url: exec.telephony_data?.recording_url || "",
                            extracted_data: exec.extracted_data || null,
                            status: exec.status,
                            bolna_updated_at: bolnaUpdatedAt,
                            synced_at: new Date(),
                        },
                        // DO NOT include userId in $set — never overwrite on existing record
                    }
                );
                updated++;
            } else {
                // New record — set userId from MongoDB Agent doc
                await Call.findOneAndUpdate(
                    { call_id: exec.id },
                    {
                        $set: {
                            userId, // sourced from MongoDB Agent, not Bolna
                            agent_id: exec.agent_id,
                            agent_name: mongoAgent.agentName,
                            batch_id: exec.batch_id || null,
                            caller_number: normalizePhone(callerNumber) || callerNumber,
                            call_duration: exec.conversation_time || 0,
                            call_timestamp: exec.created_at,
                            transcript: exec.transcript || "",
                            call_direction: direction,
                            total_cost: exec.total_cost || 0,
                            cost_breakdown: exec.cost_breakdown || null,
                            recording_url: exec.telephony_data?.recording_url || "",
                            extracted_data: exec.extracted_data || null,
                            status: exec.status,
                            bolna_updated_at: bolnaUpdatedAt,
                            synced_at: new Date(),
                            created_at: new Date(exec.created_at),
                        },
                        $setOnInsert: {
                            processed: false,
                            llm_retries: 0,
                            llm_analysis: null,
                            raw_llm_output: null,
                        },
                    },
                    { upsert: true }
                );
                created++;

                // Upsert Contact (fast, no LLM) — also tracks returning callers
                if (callerNumber) {
                    const normalizedPhone = normalizePhone(callerNumber);
                    try {
                        await Contact.findOneAndUpdate(
                            { userId, phone: normalizedPhone },
                            {
                                $setOnInsert: {
                                    name: `Contact ${normalizedPhone.slice(-4)}`,
                                    userId,
                                    phone: normalizedPhone,
                                    email: "",
                                    tag: "fresh",
                                    source: direction === "outbound" ? "bolna_outbound" : "bolna_inbound",
                                    created_at: new Date(),
                                },
                                $set: { updated_at: new Date() },
                                $inc: {
                                    call_count: 1,
                                    total_call_duration: exec.conversation_time || 0,
                                },
                            },
                            { upsert: true }
                        );
                    } catch (dupErr: any) {
                        if (dupErr.code !== 11000) {
                            console.error(`[SyncPoller][${runId}] Contact upsert error for ${callerNumber}:`, dupErr.message);
                        }
                    }

                    // Upsert Customer — every call creates a Customer immediately, no LLM needed
                    try {
                        await Customer.findOneAndUpdate(
                            { userId, phoneNumber: normalizedPhone },
                            {
                                $setOnInsert: {
                                    name: `Contact ${normalizedPhone.slice(-4)}`,
                                    email: "",
                                    status: "fresh",
                                    // pastConversations NOT pre-initialized — $push in Phase 3
                                    // auto-creates the array; pre-initializing here would conflict
                                    // with $push when both operators fire on a new document.
                                },
                                $addToSet: {
                                    callDirections: direction === "outbound" ? "outbound" : "inbound",
                                },
                                $set: { updatedAt: new Date() },
                            },
                            { upsert: true }
                        );
                    } catch (dupErr: any) {
                        if (dupErr.code !== 11000) {
                            console.error(`[SyncPoller][${runId}] Customer upsert error for ${callerNumber}:`, dupErr.message);
                        }
                    }
                }
            }
        }

        page++;
        if (page > 100) {
            console.warn(`[SyncPoller][${runId}] Safety break at page 100 for agent ${mongoAgent.bolnaAgentId}`);
            break;
        }
    }

    return { checked, created, updated };
}

// ─── PHASE 3: LLM analysis for new calls with transcripts ────────────────────

async function runLlmAnalysis(runId: string): Promise<number> {
    const unanalyzed = await Call.find({
        processed: false,
        llm_analysis: null,
        transcript: { $exists: true, $ne: "" },
        // Exclude calls that have already exhausted all retry attempts.
        // `$not: { $gte: MAX_LLM_RETRIES }` also matches docs where llm_retries is
        // missing/null (legacy records created before this field existed), so old
        // unanalyzed calls are not silently abandoned after a schema migration.
        llm_retries: { $not: { $gte: MAX_LLM_RETRIES } },
    })
        .sort({ created_at: -1 })
        .limit(MAX_LLM_PER_RUN)
        .lean();

    let count = 0;
    for (let i = 0; i < unanalyzed.length; i++) {
        const call = unanalyzed[i];

        if (!call.transcript || call.transcript.trim().length < 15) {
            // Short / dropped / silent call — generate synthetic analysis instead of skipping.
            // This ensures the Call has llm_analysis != null so GET /api/crm enrichment
            // can populate the Customer row (name, pastConversations, history tab).
            const direction = call.call_direction === "inbound" ? "Inbound" : "Outbound";
            const hasShortTranscript = !!(call.transcript && call.transcript.trim().length > 0);
            const durationNote = call.call_duration ? ` (${Math.round(call.call_duration)}s)` : "";

            const summaryEn = hasShortTranscript
                ? `${direction} call${durationNote} — very short conversation, possibly a dropped or incomplete call.`
                : `${direction} call${durationNote} — no conversation recorded (dropped or silent call).`;

            const summaryHi = direction === "Inbound"
                ? (hasShortTranscript
                    ? `इनकमिंग कॉल${durationNote} — बहुत कम बातचीत, संभवतः कॉल ड्रॉप हुई।`
                    : `इनकमिंग कॉल${durationNote} — कोई बातचीत रिकॉर्ड नहीं हुई।`)
                : (hasShortTranscript
                    ? `आउटगोइंग कॉल${durationNote} — बहुत कम बातचीत, संभवतः कॉल ड्रॉप हुई।`
                    : `आउटगोइंग कॉल${durationNote} — कोई बातचीत रिकॉर्ड नहीं हुई।`);

            const syntheticAnalysis = {
                summary: summaryEn,
                summary_en: summaryEn,
                summary_hi: summaryHi,
                intent: "queries",
                next_step: "Attempt to reach the customer again.",
                sentiment: "neutral",
                customer_name: null,
                contact_name: null,
                call_direction: call.call_direction || "unknown",
                booking: { is_booked: false, date: null, time: null, raw_datetime_string: null },
            };

            await Call.updateOne(
                { call_id: call.call_id },
                { $set: { llm_analysis: syntheticAnalysis, processed: true } }
            );
            console.log(`[SyncPoller][${runId}] ✓ Synthetic analysis for short/silent call ${call.call_id}`);
            count++;
            continue;
        }

        if (i > 0) {
            console.log(`[SyncPoller][${runId}] Waiting ${DELAY_BETWEEN_LLM_MS / 1000}s before next LLM call...`);
            await sleep(DELAY_BETWEEN_LLM_MS);
        }

        try {
            console.log(`[SyncPoller][${runId}] Analyzing call ${call.call_id}...`);
            // Pass call_timestamp so LLM resolves "kal"/"aaj" relative to call date, not poller run date
            const result = await analyzeTranscript(call.transcript, call.call_timestamp || undefined);
            const analysis = result.analysis;

            await Call.updateOne(
                { call_id: call.call_id },
                {
                    $set: {
                        llm_analysis: analysis,
                        processed: true,
                        raw_llm_output: analysis ? null : result.raw,
                    },
                }
            );

            // Update Contact + Customer with analysis result
            if (call.caller_number && analysis) {
                const normalizedPhone = normalizePhone(call.caller_number);

                let status = "fresh";
                if (analysis.booking?.is_booked) status = "purchased";
                else if (analysis.intent === "booked") status = "purchased";
                else if (analysis.intent === "interested") status = "interested";
                else if (analysis.intent === "follow_up") status = "follow_up";
                else if (analysis.intent === "not_interested") status = "not_interested";

                const contactUpdate: any = {
                    $set: {
                        last_call_date: new Date(call.call_timestamp),
                        last_call_summary: analysis.summary || call.transcript.substring(0, 100) + "...",
                        last_call_agent: call.agent_name,
                        updated_at: new Date(),
                    },
                };
                if (status !== "fresh") contactUpdate.$set.tag = status;
                if (analysis.customer_name && !analysis.customer_name.toLowerCase().includes("bolna lead")) {
                    contactUpdate.$set.name = analysis.customer_name;
                }

                try {
                    await Contact.findOneAndUpdate(
                        { userId: call.userId, phone: normalizedPhone },
                        contactUpdate
                    );
                } catch (e: any) {
                    if (e.code !== 11000) console.error(`[SyncPoller][${runId}] Contact update error:`, e.message);
                }

                const customerUpdate: any = {
                    $set: { updatedAt: new Date() },
                    $setOnInsert: {
                        name: `Contact ${normalizedPhone.slice(-4)}`,
                        email: "",
                        status: "fresh",
                        // pastConversations NOT pre-initialized — $push below auto-creates
                        // the array. Pre-initializing here conflicts with $push when both
                        // operators fire simultaneously on a new document (MongoDB disallows
                        // two operators modifying the same path in one update).
                    },
                };
                if (status !== "fresh") customerUpdate.$set.status = status;
                if (analysis.summary) {
                    customerUpdate.$push = {
                        pastConversations: {
                            date: new Date(call.call_timestamp),
                            summary: analysis.summary,
                            notes: call.transcript || "No transcript",
                        },
                    };
                }
                if (
                    analysis.customer_name &&
                    !analysis.customer_name.toLowerCase().includes("bolna lead")
                ) {
                    customerUpdate.$set.name = analysis.customer_name;
                }

                try {
                    await Customer.findOneAndUpdate(
                        { userId: call.userId, phoneNumber: normalizedPhone },
                        customerUpdate,
                        { upsert: true }
                    );
                } catch (e: any) {
                    console.error(`[SyncPoller][${runId}] Customer update error:`, e.message);
                }
            }

            count++;
            console.log(`[SyncPoller][${runId}] ✓ LLM done for ${call.call_id} — intent: ${analysis?.intent}`);
        } catch (err: any) {
            console.error(`[SyncPoller][${runId}] LLM failed for ${call.call_id}:`, err.message);

            // Increment the retry counter. If it has now reached the ceiling,
            // mark processed=true so this call is permanently skipped on future
            // runs. Otherwise leave processed=false — the next poller run will
            // retry automatically (up to MAX_LLM_RETRIES attempts total).
            const newRetryCount = (call.llm_retries ?? 0) + 1;
            const exhausted = newRetryCount >= MAX_LLM_RETRIES;

            await Call.updateOne(
                { call_id: call.call_id },
                {
                    $set: {
                        llm_retries: newRetryCount,
                        ...(exhausted && { processed: true }),
                    },
                }
            );

            if (exhausted) {
                console.warn(
                    `[SyncPoller][${runId}] Call ${call.call_id} exhausted ${MAX_LLM_RETRIES} LLM retries — permanently skipped.`
                );
            } else {
                console.log(
                    `[SyncPoller][${runId}] Call ${call.call_id} will be retried (attempt ${newRetryCount}/${MAX_LLM_RETRIES}).`
                );
            }
        }
    }

    return count;
}

// ─── PHASE 4: Sync campaign batch statuses ────────────────────────────────────

async function syncCampaignStatuses(runId: string): Promise<void> {
    const terminalStatuses = ["completed", "failed", "stopped", "executed"];
    const campaigns = await Campaign.find({
        batchId: { $ne: null },
        status: { $nin: terminalStatuses },
    }).lean();

    if (!campaigns.length) return;

    // Build user→apiKey cache
    const userKeyCache = new Map<string, string>();

    for (const campaign of campaigns) {
        const userId = campaign.userId.toString();
        try {
            let apiKey = userKeyCache.get(userId);
            if (!apiKey) {
                const user = await User.findById(userId).lean();
                if (!user || !user.bolnaApiKey) continue;
                apiKey = getApiKey(user.bolnaApiKey);
                userKeyCache.set(userId, apiKey);
            }

            const batchResp = await fetch(
                `${BOLNA_API}/batches/${campaign.batchId}`,
                {
                    headers: { Authorization: `Bearer ${apiKey}` },
                    signal: AbortSignal.timeout(10_000),
                }
            );

            if (!batchResp.ok) continue;

            const batch = (await batchResp.json()) as {
                status?: string;
                execution_status?: Record<string, number>;
            };

            const statusMap: Record<string, string> = {
                scheduled: "scheduled",
                executing: "running",
                executed: "completed",
                completed: "completed",
                failed: "failed",
                stopped: "stopped",
                queued: "running",
            };

            const newStatus = batch.status ? statusMap[batch.status] : undefined;
            if (newStatus && newStatus !== campaign.status) {
                await Campaign.updateOne(
                    { _id: campaign._id },
                    { $set: { status: newStatus } }
                );
                console.log(
                    `[SyncPoller][${runId}] Campaign ${campaign._id} status: ${campaign.status} → ${newStatus}`
                );
            }
        } catch (err: any) {
            console.error(
                `[SyncPoller][${runId}] Campaign sync error for ${campaign._id}:`,
                err.message
            );
        }
    }
}

// ─── MAIN POLLER ENTRY POINT ──────────────────────────────────────────────────

export async function runSyncPoller(): Promise<void> {
    const runId = `run_${Date.now()}`;
    console.log(`\n[SyncPoller][${runId}] ======== Poller run started ========`);

    // ── Step 1: Sync agents from Bolna → MongoDB for all active users ──
    const users = await User.find({
        bolnaApiKey: { $ne: null },
        $or: [
            { subscriptionStatus: "active" },
            { subscriptionStatus: "trial" },
            { trialExpiresAt: { $gt: new Date() } },
        ],
    });

    console.log(`[SyncPoller][${runId}] Found ${users.length} active users. Syncing agents...`);

    for (const user of users) {
        if (!user.bolnaApiKey) continue;
        try {
            const apiKey = getApiKey(user.bolnaApiKey);
            await syncAgentsForUser(user._id.toString(), apiKey);
        } catch (err: any) {
            console.error(`[SyncPoller][${runId}] Agent sync failed for user ${user.email}:`, err.message);
        }
    }

    // ── Step 2: Fetch all agents from MongoDB (tenant ownership map) ──
    const allAgents = await Agent.find({ isActive: true }).lean();
    console.log(`[SyncPoller][${runId}] Processing ${allAgents.length} agents from MongoDB...`);

    // Build user→apiKey cache
    const userKeyCache = new Map<string, string>();
    let totalChecked = 0, totalCreated = 0, totalUpdated = 0;

    for (const mongoAgent of allAgents) {
        const userId = mongoAgent.userId;

        // Validate — skip if userId somehow missing (should never happen)
        if (!userId) {
            console.warn(
                `[SyncPoller][${runId}] SKIPPED agent ${mongoAgent.bolnaAgentId} — no userId in MongoDB Agent doc`
            );
            continue;
        }

        try {
            let apiKey = userKeyCache.get(userId);
            if (!apiKey) {
                const user = await User.findById(userId).lean();
                if (!user || !user.bolnaApiKey) {
                    console.warn(
                        `[SyncPoller][${runId}] SKIPPED agent ${mongoAgent.bolnaAgentId} — user ${userId} has no API key`
                    );
                    continue;
                }
                apiKey = getApiKey(user.bolnaApiKey);
                userKeyCache.set(userId, apiKey);
            }

            const stats = await syncCallsForAgent(
                runId,
                {
                    userId,
                    bolnaAgentId: mongoAgent.bolnaAgentId,
                    agentName: mongoAgent.agentName,
                },
                apiKey
            );

            totalChecked += stats.checked;
            totalCreated += stats.created;
            totalUpdated += stats.updated;

            console.log(
                `[SyncPoller][${runId}] Agent ${mongoAgent.agentName}: checked=${stats.checked} created=${stats.created} updated=${stats.updated}`
            );
        } catch (err: any) {
            console.error(
                `[SyncPoller][${runId}] Call sync failed for agent ${mongoAgent.bolnaAgentId} (userId=${userId}):`,
                err.message
            );
            // Continue to next agent — don't stop the whole run
        }
    }

    console.log(
        `[SyncPoller][${runId}] Call sync complete: checked=${totalChecked} created=${totalCreated} updated=${totalUpdated}`
    );

    // ── Step 3: LLM analysis ──
    const llmCount = await runLlmAnalysis(runId);
    console.log(`[SyncPoller][${runId}] LLM analyses triggered: ${llmCount}`);

    // ── Step 4: Campaign status sync ──
    await syncCampaignStatuses(runId);

    console.log(`[SyncPoller][${runId}] ======== Poller run complete ========\n`);
}
