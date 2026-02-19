/**
 * Grok (xAI) LLM Service
 * Sends transcript → gets structured JSON analysis back.
 * Uses OpenAI-compatible chat completions endpoint at https://api.x.ai/v1
 */

export interface LLMAnalysis {
    summary: string;
    intent: string;
    call_direction: string;
    booking: {
        is_booked: boolean;
        date: string | null;
        time: string | null;
        raw_datetime_string: string | null;
    };
}

const SYSTEM_PROMPT = `You are an AI assistant that analyzes call transcripts.
Given the transcript below, return ONLY a valid JSON object with exactly these fields:

{
  "summary": "2-3 sentence summary of the call",
  "intent": "one of: queries / booked / not_interested",
  "call_direction": "inbound or outbound - infer from who initiated the conversation and context",
  "booking": {
    "is_booked": true or false,
    "date": "YYYY-MM-DD or null if not booked",
    "time": "HH:MM AM/PM or null if not booked",
    "raw_datetime_string": "what the caller actually said, or null"
  }
}

Intent classification rules:
- "booked": The caller confirmed a booking, appointment, reservation, or scheduled something.
- "not_interested": The caller explicitly declined, refused, said no thanks, or expressed disinterest.
- "queries": Everything else — questions, inquiries, information requests, general conversations, complaints, follow-ups.

Return ONLY the JSON. No explanation. No markdown. No extra text.`;

export async function analyzeTranscript(
    transcript: string
): Promise<{ analysis: LLMAnalysis | null; raw: string }> {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) throw new Error("GROK_API_KEY not set in .env");

    const url = "https://api.x.ai/v1/chat/completions";

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "grok-3-mini-fast",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Transcript:\n${transcript}` },
            ],
            temperature: 0,
            response_format: { type: "json_object" },
        }),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Grok API ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const raw: string =
        data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    try {
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
        const analysis: LLMAnalysis = JSON.parse(cleaned);
        return { analysis, raw };
    } catch {
        console.error("[LLM] Failed to parse JSON:", raw);
        return { analysis: null, raw };
    }
}
