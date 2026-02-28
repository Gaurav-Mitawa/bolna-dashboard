/**
 * Bookings API — Reads from Call-Processor backend
 * Transforms LLM-processed Call documents into Booking shapes
 * for the Calendar and List views.
 */

// ─── Types ───────────────────────────────────────────────────

export interface Booking {
  id: string;
  contact_name: string;
  service_name: string;
  service_date: string;   // YYYY-MM-DD
  service_time: string;   // HH:MM AM/PM
  status: "confirmed" | "pending" | "completed" | "cancelled";
  intent_category: "booked" | "queries" | "not_interested" | "interested" | "follow_up";
  location: string;
  amount: string;
  revenue?: number;
  caller_number: string;
  call_duration: number;
  call_direction: string;
  transcript?: string;
  summary?: string;
  created_at: string;
  // Legacy fields kept for component compatibility
  contact_id: string;
  service_date_raw: string;
  payment_status: string;
}

export interface BookingFilters {
  status?: string;
  start_date?: string;
  end_date?: string;
}

// ─── Raw Call shape from backend ─────────────────────────────

interface RawCall {
  call_id: string;
  agent_id: string;
  caller_number: string;
  call_duration: number;
  call_timestamp: string;
  transcript: string;
  call_direction: string;
  llm_analysis: {
    summary: string;
    intent: string;
    contact_name?: string | null;
    call_direction: string;
    booking: {
      is_booked: boolean;
      date: string | null;
      time: string | null;
      raw_datetime_string: string | null;
    };
  } | null;
  processed: boolean;
  created_at: string;
}

// ─── Transform Call → Booking ────────────────────────────────

function callToBooking(call: RawCall): Booking {
  const analysis = call.llm_analysis;
  const intent = (analysis?.intent || "queries") as Booking["intent_category"];

  // Map intent → booking status
  let status: Booking["status"] = "pending";
  if (intent === "booked") status = "confirmed";
  else if (intent === "interested") status = "pending";
  else if (intent === "follow_up") status = "pending";
  else if (intent === "queries") status = "pending";
  else if (intent === "not_interested") status = "cancelled";

  // Extract date/time from LLM analysis or fallback to call timestamp
  let serviceDate = analysis?.booking?.date || "";
  let serviceTime = analysis?.booking?.time || "";

  if (!serviceDate && call.call_timestamp) {
    const dt = new Date(call.call_timestamp);
    serviceDate = dt.toISOString().split("T")[0];
    serviceTime = dt.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  return {
    id: call.call_id,
    contact_name: analysis?.contact_name || call.caller_number || "Unknown",
    service_name: analysis?.summary || "Call",
    service_date: serviceDate,
    service_time: serviceTime,
    status,
    intent_category: intent,
    location: "",
    amount: "",
    revenue: 0,
    caller_number: call.caller_number,
    call_duration: call.call_duration,
    call_direction: call.call_direction,
    transcript: call.transcript,
    summary: analysis?.summary,
    created_at: call.created_at,
    // Legacy compat
    contact_id: call.call_id,
    service_date_raw: call.call_timestamp,
    payment_status: "paid",
  };
}

// ─── API Functions ───────────────────────────────────────────

import { API_BASE_URL } from "@/lib/api";

// ─── API Functions ───────────────────────────────────────────

/**
 * Fetch booked calls (intent = "booked", is_booked = true)
 */
export async function getBookedCalls(): Promise<Booking[]> {
  const res = await fetch(`${API_BASE_URL}/api/call-bookings`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const calls: RawCall[] = await res.json();
  return calls.map(callToBooking);
}

/**
 * Fetch ALL LLM-processed calls (all intents for List view)
 */
export async function getQueriesCalls(): Promise<Booking[]> {
  const res = await fetch(`${API_BASE_URL}/api/queries-calls`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const calls: RawCall[] = await res.json();
  return calls.map(callToBooking);
}

/**
 * Fetch ALL processed calls for the List view.
 * Since /api/queries-calls now returns all intents, we use it directly.
 */
export async function getBookings(
  _filters?: BookingFilters
): Promise<Booking[]> {
  const all = await getQueriesCalls();

  // Sort by date descending (newest first)
  all.sort(
    (a, b) =>
      new Date(b.service_date || b.created_at).getTime() -
      new Date(a.service_date || a.created_at).getTime()
  );

  return all;
}

/**
 * Get a single booking by call_id
 */
export async function getBooking(callId: string): Promise<Booking> {
  const res = await fetch(`${API_BASE_URL}/api/call-bookings/${callId}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const call: RawCall = await res.json();
  return callToBooking(call);
}
