/**
 * API client for the call-processor backend.
 * Talks to Express routes: /api/call-bookings, /api/processed-calls, etc.
 */

const BASE = "";  // same origin — Express serves both frontend and API

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${url}`, init);
    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`API error ${res.status}: ${errBody}`);
    }
    return res.json();
}

export interface CallBooking {
    call_id: string;
    agent_id: string;
    caller_number: string;
    call_duration: number;
    call_timestamp: string;
    transcript: string;
    llm_analysis: {
        summary: string;
        intent: string;
        booking: {
            is_booked: boolean;
            date: string | null;
            time: string | null;
            raw_datetime_string: string | null;
        };
    };
    processed: boolean;
    created_at: string;
}

export interface ProcessResult {
    success: boolean;
    total: number;
    processed: number;
    failed: number;
    error?: string;
}

export const callProcessorApi = {
    /** Trigger the poll → LLM → save pipeline */
    triggerProcessing: () =>
        fetchJson<ProcessResult>("/api/internal/process-calls", { method: "POST" }),

    /** Get all bookings (is_booked = true) */
    getBookings: () => fetchJson<CallBooking[]>("/api/call-bookings"),

    /** Get a single booking by call_id */
    getBooking: (callId: string) =>
        fetchJson<CallBooking>(`/api/call-bookings/${callId}`),

    /** Get all processed calls */
    getProcessedCalls: () => fetchJson<CallBooking[]>("/api/processed-calls"),

    /** Get queries-intent calls */
    getQueriesCalls: () => fetchJson<CallBooking[]>("/api/queries-calls"),

    /** Get a single processed call */
    getProcessedCall: (callId: string) =>
        fetchJson<CallBooking>(`/api/processed-calls/${callId}`),
};
