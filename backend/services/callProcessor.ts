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
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < newCalls.length; i++) {
        const call = newCalls[i];

        // Delay between calls (skip for first one)
        if (i > 0) {
            console.log(`[Processor] Waiting ${DELAY_BETWEEN_CALLS_MS / 1000}s before next call...`);
            await sleep(DELAY_BETWEEN_CALLS_MS);
        }

        let analysis = null;
        let raw = null;

        try {
            const result = await analyzeWithRetry(call.transcript, call.call_id);
            analysis = result.analysis;
            raw = result.raw;
        } catch (err) {
            console.error(`[Processor] LLM analysis failed for ${call.call_id}, saving raw transcript only. Error:`, err);
            // We continue to save the call with analysis=null
        }

        try {
            await Call.updateOne(
                { call_id: call.call_id },
                {
                    $set: {
                        agent_id: call.agent_id,
                        caller_number: call.caller_number,
                        call_duration: call.call_duration,
                        call_timestamp: call.call_timestamp,
                        transcript: call.transcript,
                        call_direction: analysis?.call_direction || "unknown",
                        llm_analysis: analysis,
                        processed: !!analysis,
                        raw_llm_output: analysis ? null : raw, // Save raw if analysis failed
                        created_at: new Date(),
                    },
                },
                { upsert: true }
            );

            // Upsert Contact
            const contactName = `Contact ${call.caller_number.slice(-4)}`;
            const summary = analysis?.summary || (call.transcript ? call.transcript.substring(0, 100) + "..." : "No summary");
            const tag = analysis?.intent || "fresh";

            await Contact.findOneAndUpdate(
                { phone: call.caller_number },
                {
                    $setOnInsert: {
                        created_at: new Date(),
                        name: contactName,
                        email: ""
                    },
                    $set: {
                        updated_at: new Date(),
                        last_call_date: new Date(),
                        last_call_summary: summary,
                        tag: tag,
                        source: call.agent_id ? "bolna_agent" : "unknown"
                    },
                    $inc: {
                        call_count: 1,
                        total_call_duration: call.call_duration || 0
                    }
                },
                { upsert: true }
            );

            if (analysis) {
                processed++;
                console.log(`[Processor] ✓ ${call.call_id} — intent: ${analysis.intent}`);
            } else {
                failed++;
                console.log(`[Processor] ⚠ ${call.call_id} — Saved raw transcript (LLM failed)`);
            }
        } catch (dbErr) {
            failed++;
            console.error(`[Processor] DB Error on ${call.call_id}:`, dbErr);
        }
    }

    return { total: newCalls.length, processed, failed };
}
