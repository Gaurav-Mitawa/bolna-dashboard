/**
 * Call Processor — Orchestrator
 * pollNewCalls() → analyzeTranscript() → save to MongoDB
 * Includes rate-limit handling with retry + delay between calls.
 */
import { pollNewCalls } from "./callPoller.js";
import { analyzeTranscript } from "./llmService.js";
import { Call } from "../models/Call.js";
import { Contact } from "../models/Contact.js";
import { Customer } from "../models/Customer.js";
import { normalizePhone } from "../utils/phoneUtils.js";

const DELAY_BETWEEN_CALLS_MS = 10_000; // 10s pause between each LLM call
const MAX_RETRIES = 3;
const MAX_CALLS_PER_BATCH = 10; // Limit LLM hits per run

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

export async function processNewCalls(userId: string, apiKey: string) {
    const newCalls = await pollNewCalls(userId, apiKey);

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
                        userId,
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

            if (call.caller_number) {
                const normalizedContactPhone = normalizePhone(call.caller_number);
                try {
                    await Contact.findOneAndUpdate(
                        {
                            userId,
                            $or: [
                                { phone: call.caller_number },
                                { phone: normalizedContactPhone }
                            ]
                        },
                        {
                            $setOnInsert: {
                                name: `Contact ${normalizedContactPhone.slice(-4)}`,
                                userId,
                                phone: normalizedContactPhone,
                                email: "",
                                tag: "fresh",
                                source: call.call_direction === "outbound" ? "bolna_outbound" : "bolna_inbound",
                                created_at: new Date(),
                                call_count: 0,
                                total_call_duration: 0
                            },
                            $set: {
                                updated_at: new Date(),
                            },
                        },
                        { upsert: true, returnDocument: "after" }
                    );
                } catch (dupErr: any) {
                    if (dupErr.code === 11000) {
                        // Contact already exists with this phone — just update it
                        await Contact.findOneAndUpdate(
                            { phone: normalizedContactPhone },
                            { $set: { updated_at: new Date() } }
                        );
                    } else {
                        throw dupErr;
                    }
                }
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
    let batchCount = 0;

    for (let i = 0; i < newCalls.length; i++) {
        if (batchCount >= MAX_CALLS_PER_BATCH) {
            console.log(`[Processor] Batch limit (${MAX_CALLS_PER_BATCH}) reached. Stopping LLM analysis for this run.`);
            break;
        }

        const call = newCalls[i];

        // Check if already processed to avoid re-running LLM
        const existingCall = await Call.findOne({ call_id: call.call_id });
        if (existingCall && existingCall.processed) {
            continue;
        }

        // Skip if transcript is too short to be meaningful
        if (!call.transcript || call.transcript.trim().length < 15) {
            console.log(`[Processor] Skipping short/empty transcript for ${call.call_id}`);
            await Call.updateOne({ call_id: call.call_id }, { $set: { processed: true } });
            continue;
        }

        batchCount++;

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
        }

        try {
            // Update Call with Analysis
            await Call.updateOne(
                { call_id: call.call_id },
                {
                    $set: {
                        llm_analysis: analysis,
                        processed: true, // Always mark as processed to stop retries
                        raw_llm_output: analysis ? null : raw,
                    },
                }
            );

            // Update Contact with Summary/Intent
            if (call.caller_number && analysis) {
                let status = "fresh";
                if (analysis.booking?.is_booked) status = "purchased";
                else if (analysis.intent === "booked") status = "purchased";
                else if (analysis.intent === "interested") status = "interested";
                else if (analysis.intent === "follow_up") status = "follow_up";
                else if (analysis.intent === "not_interested") status = "not_interested";
                else status = "fresh";

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

                if (status !== "fresh") {
                    updateOps.$set.tag = status;
                }
                // For Contacts
                // We only want to set the name if the LLM actually found a real name.
                // If the LLM returned a placeholder or 'Bolna Lead', we skip setting it 
                // on the contact if it's not a real improvement.
                let shouldUpdateContactName = !!analysis.contact_name;
                if (analysis.contact_name && analysis.contact_name.toLowerCase().includes('bolna lead')) {
                    shouldUpdateContactName = false;
                }
                if (shouldUpdateContactName) {
                    updateOps.$set.name = analysis.contact_name;
                }

                const normalizedContactPhone = normalizePhone(call.caller_number);
                try {
                    await Contact.findOneAndUpdate(
                        {
                            userId,
                            $or: [
                                { phone: call.caller_number },
                                { phone: normalizedContactPhone }
                            ]
                        },
                        updateOps
                    );
                } catch (dupErr: any) {
                    if (dupErr.code === 11000) {
                        // Contact already exists with this phone (possibly under different userId due to indexing)
                        // Fall back to just updating it by phone
                        await Contact.findOneAndUpdate(
                            { phone: normalizedContactPhone },
                            updateOps
                        );
                    } else {
                        throw dupErr;
                    }
                }

                // ALSO UPDATE THE CUSTOMER COLLECTION
                try {
                    // First, fetch existing customer to avoid overwriting a good name with a bad LLM guess
                    const existingCustomer = await Customer.findOne({
                        userId,
                        phoneNumber: normalizedContactPhone
                    });

                    const customerUpdateOps: any = {
                        $set: {
                            updatedAt: new Date()
                        }
                    };

                    if (status !== "fresh") {
                        customerUpdateOps.$set.status = status;
                    }

                    // Smart name update logic for Customer
                    let shouldUpdateCustomerName = false;
                    if (analysis.contact_name) {
                        const isLlmNamePlaceholder = analysis.contact_name.toLowerCase().includes('bolna lead');
                        if (!existingCustomer) {
                            shouldUpdateCustomerName = true;
                        } else {
                            const existingName = existingCustomer.name;
                            const hasValidExistingName = existingName && !existingName.toLowerCase().includes('bolna lead');

                            if (hasValidExistingName) {
                                // Only overwrite a good existing name if the LLM returned a good name
                                if (!isLlmNamePlaceholder) {
                                    shouldUpdateCustomerName = true;
                                }
                            } else {
                                // Existing name is bad or missing, so update it (even to another placeholder if needed, though usually better real name)
                                shouldUpdateCustomerName = true;
                            }
                        }
                    }

                    if (shouldUpdateCustomerName) {
                        customerUpdateOps.$set.name = analysis.contact_name;
                    }

                    // Add summary to pastConversations if present
                    if (analysis.summary) {
                        customerUpdateOps.$push = {
                            pastConversations: {
                                date: new Date(call.call_timestamp),
                                summary: analysis.summary,
                                notes: call.transcript || "No transcript available",
                            }
                        };
                    }

                    await Customer.findOneAndUpdate(
                        {
                            userId,
                            phoneNumber: normalizedContactPhone
                        },
                        customerUpdateOps
                    );
                } catch (customerErr: any) {
                    console.error(`[Processor] Phase 2 Customer Update Error on ${call.call_id}:`, customerErr);
                }
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
