/**
 * Grok (xAI) LLM Service
 * Sends transcript → gets structured JSON analysis back.
 * Uses OpenAI-compatible chat completions endpoint at https://api.x.ai/v1
 */

export interface LLMAnalysis {
    summary: string; // Mirror of summary_en for legacy compatibility
    summary_en: string;
    summary_hi: string;
    intent: string;
    next_step: string;
    sentiment: string;
    contact_name: string | null;
    customer_name: string | null; // Legacy mirror of contact_name
    call_direction: string;
    booking: {
        is_booked: boolean;
        date: string | null;
        time: string | null;
        raw_datetime_string: string | null;
    };
}

const SYSTEM_PROMPT = `You are a voice call analyst AI. Analyze the call transcript and return ONLY a valid JSON object — no markdown, no code blocks, no explanation.

Field Rules:
1 — summary_en: A concise English summary of the call (3-4 sentences).
2 — summary_hi: The same summary translated into Hindi (Devanagari script).
3 — summary: Duplicate of summary_en (required for legacy compatibility).
4 — next_step: A single actionable task that should follow this call.
5 — sentiment: Exactly one of: positive / neutral / negative
6 — contact_name: The name of the customer if mentioned, otherwise null.
7 — call_direction: inbound or outbound based on the dialogue.
8 — intent: exactly one of: queries / booked / not_interested
9 — booking: An object containing { is_booked: boolean, date: YYYY-MM-DD or null, time: HH:MM or null, raw_datetime_string: string or null }

Intent Rules:
- booked: Customer confirmed a booking/appointment.
- not_interested: Customer explicitly said no or expressed disinterest.
- queries: Everything else (questions, feedback, general talk).

Return ONLY the JSON.`;

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

        // --- Post-process Mirrors for Consistency ---

        // Mirror summary fields
        if (analysis.summary_en && !analysis.summary) {
            analysis.summary = analysis.summary_en;
        } else if (analysis.summary && !analysis.summary_en) {
            analysis.summary_en = analysis.summary;
        }

        // Mirror name fields
        if (analysis.contact_name && !analysis.customer_name) {
            analysis.customer_name = analysis.contact_name;
        } else if (analysis.customer_name && !analysis.contact_name) {
            analysis.contact_name = analysis.customer_name;
        }

        // Defaults for required fields
        if (!analysis.sentiment || !["positive", "neutral", "negative"].includes(analysis.sentiment)) {
            analysis.sentiment = "neutral";
        }
        if (!analysis.call_direction || !["inbound", "outbound"].includes(analysis.call_direction)) {
            analysis.call_direction = "outbound";
        }

        return { analysis, raw };
    } catch {
        console.error("[LLM] Failed to parse JSON:", raw);
        return { analysis: null, raw };
    }
}
