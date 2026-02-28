/**
 * Grok (xAI) LLM Service
 * Sends transcript → gets structured JSON analysis back.
 * Uses OpenAI-compatible chat completions endpoint at https://api.x.ai/v1
 */

export interface LLMAnalysis {
    summary: string;
    intent: string;
    contact_name: string | null;
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
  "intent": "one of: queries / booked / interested / not_interested / follow_up",
  "contact_name": "extracted name of the person from the transcript, or null if not explicitly mentioned",
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
- "interested": The caller verbally indicated strong interest, asked for quotes, next steps, or requested a callback, but did not commit to a specific booking date/time yet.
- "follow_up": The caller requested to be contacted again, asked for a follow-up call, or the agent promised to call back at a later time.
- "not_interested": The caller explicitly declined, refused, said no thanks, or expressed disinterest.
- "queries": Everything else — general questions, inquiries, information requests.

Return ONLY the JSON. No explanation. No markdown. No extra text.`;

export async function analyzeTranscript(
    transcript: string
): Promise<{ analysis: LLMAnalysis | null; raw: string }> {
    const grokKey = process.env.GROK_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let apiKey = grokKey || geminiKey;
    if (!apiKey) throw new Error("No LLM API Key (GROK_API_KEY or GEMINI_API_KEY) found in .env");

    let url = "https://api.x.ai/v1/chat/completions";
    let model = "grok-3-mini";

    // --- Automatic Provider Detection ---
    if (apiKey.startsWith("gsk_")) {
        // Groq API Key
        url = "https://api.groq.com/openai/v1/chat/completions";
        model = "llama-3.1-8b-instant";
        console.log("[LLM] Using Groq provider");
    } else if (apiKey.startsWith("xai-")) {
        // Grok (xAI) API Key
        url = "https://api.x.ai/v1/chat/completions";
        model = "grok-3-mini";
        console.log("[LLM] Using Grok (xAI) provider");
    } else if (apiKey.startsWith("AIza")) {
        // Gemini API Key (OpenAI Compatible Endpoint)
        url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
        model = "gemini-1.5-flash";
        console.log("[LLM] Using Gemini provider");
    } else if (grokKey) {
        // Default to Grok if GROK_API_KEY is set but prefix is unknown
        url = "https://api.x.ai/v1/chat/completions";
        model = "grok-3-mini";
        console.log("[LLM] Using default Grok provider");
    }

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: model,
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
        throw new Error(`LLM API (${model}) ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content || "";

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
