/**
 * Call Processor — Orchestrator
 * pollNewCalls() → analyzeTranscript() → save to MongoDB
 * Includes rate-limit handling with retry + delay between calls.
 */
import { pollNewCalls } from "./callPoller.js";
import { analyzeTranscript } from "./llmService.js";
import { Call } from "../models/Call.js";
import { Contact } from "../models/Contact.js";

const DELAY_BETWEEN_CALLS_MS = 10_000; // 10s pause between each LLM call
const MAX_RETRIES = 3;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper — retries on 429 with exponential backoff.
 */
async function analyzeWithRetry(transcript: string, callId: string) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await analyzeTranscript(transcript);
        } catch (err: any) {
            const is429 = err.message?.includes("429");
            if (is429 && attempt < MAX_RETRIES) {
                const backoff = attempt * 35_000; // 35s, 70s, 105s
                console.log(`[Processor] 429 on ${callId} — retrying in ${backoff / 1000}s (attempt ${attempt}/${MAX_RETRIES})`);
                await sleep(backoff);
            } else {
                throw err;
            }
        }
    }
    throw new Error("Max retries exceeded");
}

export async function processNewCalls() {
    const newCalls = await pollNewCalls();

    // --- Phase 1: Fast Sync (Database) ---
    // Ensure all calls and contacts are saved immediately so they appear in the UI.
    let synced = 0;
    for (const call of newCalls) {
        try {
            // 1. Upsert Call (processed: false initially)
            await Call.updateOne(
                { call_id: call.call_id },
                {
                    $set: {
                        agent_id: call.agent_id,
                        caller_number: call.caller_number,
                        call_duration: call.call_duration,
                        call_timestamp: call.call_timestamp,
                        transcript: call.transcript,
                        call_direction: call.call_direction,
                        agent_name: call.agent_name,
                        total_cost: call.total_cost,
                        cost_breakdown: call.cost_breakdown,
                        recording_url: call.recording_url,
                        extracted_data: call.extracted_data,
                        created_at: new Date(call.call_timestamp),
                    },
                    $setOnInsert: {
                        processed: false,
                        llm_analysis: null,
                        raw_llm_output: null
                    }
                },
                { upsert: true }
            );

            // 2. Upsert Contact (Link phone number immediately)
            if (call.caller_number) {
                await Contact.findOneAndUpdate(
                    { phone: call.caller_number },
                    {
                        $setOnInsert: {
                            name: `Contact ${call.caller_number.slice(-4)}`,
                            email: "",
                            tag: "fresh",
                            source: call.call_direction === "outbound" ? "bolna_outbound" : "bolna_inbound",
                            created_at: new Date(),
                            call_count: 0,
                            total_call_duration: 0
                        },
                        $set: {
                            updated_at: new Date(),
                            // We don't update last_call_summary here yet because we don't have analysis
                        },
                        // We increment stats only if we are sure this call hasn't been counted before?
                        // Actually, incrementing here is risky if we run this multiple times for the same call.
                        // Ideally, we should check if this specific call_id was already linked.
                        // For now, let's just ensure the contact exists.
                    },
                    { upsert: true, new: true }
                );
            }
            synced++;
        } catch (err) {
            console.error(`[Processor] Phase 1 Sync Error on ${call.call_id}:`, err);
        }
    }
    if (synced > 0) console.log(`[Processor] Phase 1: Synced ${synced} calls/contacts to DB.`);

    // --- Phase 2: Slow Analysis (LLM) ---
    // Process calls that haven't been analyzed yet.
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < newCalls.length; i++) {
        const call = newCalls[i];

        // Check if already processed to avoid re-running LLM
        const existingCall = await Call.findOne({ call_id: call.call_id });
        if (existingCall && existingCall.processed) {
            continue;
        }

        // Delay between calls (skip for first one in this batch)
        if (processed > 0) {
            console.log(`[Processor] Waiting ${DELAY_BETWEEN_CALLS_MS / 1000}s before next LLM analysis...`);
            await sleep(DELAY_BETWEEN_CALLS_MS);
        }

        let analysis = null;
        let raw = null;

        try {
            console.log(`[Processor] Analyzing call ${call.call_id}...`);
            const result = await analyzeWithRetry(call.transcript, call.call_id);
            analysis = result.analysis;
            raw = result.raw;
        } catch (err) {
            console.error(`[Processor] LLM analysis failed for ${call.call_id}, saving raw transcript only. Error:`, err);
            // We continue to save the call with analysis=null
        }

        try {
            // Update Call with Analysis
            await Call.updateOne(
                { call_id: call.call_id },
                {
                    $set: {
                        llm_analysis: analysis,
                        processed: !!analysis,
                        raw_llm_output: analysis ? null : raw, // Save raw if analysis failed
                    },
                }
            );

            // Update Contact with Summary/Intent
            if (call.caller_number && analysis) {
                // Determine status based on intent
                let status = "fresh";
                if (analysis.booking?.is_booked) status = "purchased";
                else if (analysis.intent === "booked") status = "purchased"; // Double check
                else if (analysis.intent === "not_interested") status = "not_interested";
                else status = "fresh"; // Default to fresh if queries

                const updateOps: any = {
                    $set: {
                        last_call_date: new Date(call.call_timestamp),
                        last_call_summary: analysis.summary || call.transcript.substring(0, 100) + "...",
                        last_call_agent: call.agent_name,
                        updated_at: new Date()
                    },
                    $inc: {
                        call_count: 1,
                        total_call_duration: call.call_duration,
                    }
                };

                // If status is significant (not simple "fresh"), update the tag for existing contacts too
                if (status !== "fresh") {
                    updateOps.$set.tag = status;
                }

                await Contact.findOneAndUpdate(
                    { phone: call.caller_number },
                    updateOps
                );
            }

            if (analysis) {
                processed++;
                console.log(`[Processor] ✓ ${call.call_id} — intent: ${analysis.intent}`);
            } else {
                failed++;
                console.log(`[Processor] ⚠ ${call.call_id} — Saved raw transcript (LLM failed)`);
            }
        } catch (dbErr) {
            failed++;
            console.error(`[Processor] Phase 2 DB Error on ${call.call_id}:`, dbErr);
        }
    }

    return { total: newCalls.length, synced, processed, failed };
}
