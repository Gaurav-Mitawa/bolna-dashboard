/**
 * Call Processor — Orchestrator
 * pollNewCalls() → analyzeTranscript() → save to MongoDB
 * Includes rate-limit handling with retry + delay between calls.
 */
import { pollNewCalls } from "./callPoller.js";
import { analyzeTranscript } from "./llmService.js";
import { Call } from "../models/Call.js";

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

        try {
            const { analysis, raw } = await analyzeWithRetry(call.transcript, call.call_id);

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
                        raw_llm_output: analysis ? null : raw,
                        created_at: new Date(),
                    },
                },
                { upsert: true }
            );

            if (analysis) {
                processed++;
                console.log(`[Processor] ✓ ${call.call_id} — intent: ${analysis.intent}`);
            } else {
                failed++;
                console.log(`[Processor] ✗ ${call.call_id} — LLM parse failed, saved raw`);
            }
        } catch (err) {
            failed++;
            console.error(`[Processor] Error on ${call.call_id}:`, err);
        }
    }

    return { total: newCalls.length, processed, failed };
}
