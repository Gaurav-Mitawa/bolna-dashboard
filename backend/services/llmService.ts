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

/**
 * Build a dynamic system prompt with today's IST date injected.
 * This allows the LLM to resolve relative date/time expressions like:
 * "kal" (tomorrow), "parso" (day after tomorrow), "aaj" (today),
 * "sham 6 baje" (18:00), "subah 10 baje" (10:00), etc.
 */
function buildSystemPrompt(today: string, tomorrow: string, dayAfterTomorrow: string): string {
    return `You are a voice call analyst AI. Analyze the call transcript and return ONLY a valid JSON object — no markdown, no code blocks, no explanation.

Call Date (IST): ${today}. This is the date the call took place. Use this date to resolve ALL relative date references in the transcript (e.g. "kal"/"tomorrow" means the day after ${today}, "aaj"/"today" means ${today}).

Relative Date Resolution:
- "aaj" / "aaj ka din" / "today" → ${today}
- "kal" / "kal ka din" / "tomorrow" / "agle din" → ${tomorrow}
- "parso" / "day after tomorrow" → ${dayAfterTomorrow}
- Specific date (e.g. "March 15", "15 tarikh", "15 March") → convert to YYYY-MM-DD

Time Resolution (output in 24-hour HH:MM format):
- "X baje" = X o'clock (e.g. "2 baje" → "14:00", "6 baje" → "06:00")
- "sham X baje" = X PM evening (e.g. "sham 6 baje" → "18:00", "sham 3 baje" → "15:00")
- "subah X baje" = X AM morning (e.g. "subah 10 baje" → "10:00", "subah 8 baje" → "08:00")
- "dopahar X baje" = X noon/afternoon (e.g. "dopahar 1 baje" → "13:00")
- "raat X baje" = X PM night (e.g. "raat 8 baje" → "20:00", "raat 9 baje" → "21:00")
- "evening X" / "X in the evening" → add 12 if < 7 (e.g. "evening 5" → "17:00")
- "morning X" / "X in the morning" → AM as-is (e.g. "morning 9" → "09:00")
- "1 week se" / "1 hafte mein" → add 7 days to today (${today})

Field Rules:
1 — summary_en: A concise English summary of the call (3-4 sentences).
2 — summary_hi: The same summary translated into Hindi (Devanagari script).
3 — summary: Duplicate of summary_en (required for legacy compatibility).
4 — next_step: A single actionable task that should follow this call.
5 — sentiment: Exactly one of: positive / neutral / negative
6 — contact_name: The name of the customer if mentioned, otherwise null.
7 — call_direction: inbound or outbound based on the dialogue.
8 — intent: exactly one of: queries / booked / not_interested
9 — booking: An object containing { is_booked: boolean, date: YYYY-MM-DD or null (resolve relative dates using mappings above), time: HH:MM in 24h format or null (resolve time expressions), raw_datetime_string: exact phrase from transcript or null }

Intent Rules:
- booked: Customer confirmed a booking/appointment.
- not_interested: Customer explicitly said no or expressed disinterest.
- queries: Everything else (questions, feedback, general talk).

Return ONLY the JSON.`;
}

export async function analyzeTranscript(
    transcript: string,
    callTimestamp?: string  // ISO date string of when the call happened (used as reference for "kal", "aaj", etc.)
): Promise<{ analysis: LLMAnalysis | null; raw: string }> {
    const grokKey = process.env.GROK_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    let apiKey = grokKey || geminiKey;
    if (!apiKey) throw new Error("No LLM API Key (GROK_API_KEY or GEMINI_API_KEY) found in .env");

    // Use the call's actual timestamp as the IST reference date.
    // This ensures "kal" (tomorrow), "aaj" (today) etc. are resolved relative to
    // when the CALL HAPPENED — not when the poller runs (which may be days later).
    const referenceUtc = (callTimestamp && !isNaN(new Date(callTimestamp).getTime()))
        ? new Date(callTimestamp)
        : new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIst = new Date(referenceUtc.getTime() + istOffset);
    const fmt = (d: Date): string => d.toISOString().split("T")[0];
    const todayStr = fmt(nowIst);
    const tomorrowDate = new Date(nowIst);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const dayAfterDate = new Date(nowIst);
    dayAfterDate.setDate(dayAfterDate.getDate() + 2);
    const systemPrompt = buildSystemPrompt(todayStr, fmt(tomorrowDate), fmt(dayAfterDate));

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

    // 30-second timeout: without this a hung LLM API stalls the entire poller indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Transcript:\n${transcript}` },
                ],
                temperature: 0,
                response_format: { type: "json_object" },
            }),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeoutId);
    }

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
        // intent and booking can be undefined if LLM omits them — callers (syncPoller Phase 3)
        // assume they always exist, so set safe defaults here.
        if (!analysis.intent) {
            analysis.intent = "queries";
        }
        if (!analysis.summary) {
            analysis.summary = analysis.summary_en || analysis.summary_hi || "";
        }
        if (!analysis.booking) {
            analysis.booking = { is_booked: false, date: null, time: null, raw_datetime_string: null };
        }

        return { analysis, raw };
    } catch {
        console.error("[LLM] Failed to parse JSON:", raw);
        return { analysis: null, raw };
    }
}
