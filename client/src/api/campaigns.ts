import { authFetchJson } from "@/lib/api";

/**
 * Request to initiate batch calls for multiple contacts
 * Phase 1: Supports tag_filter for automatic contact selection
 */
export interface BatchCallRequest {
  agent_id?: string; // Optional: Single VoiceAgent ID (backward compat)
  main_agent_id?: string; // Optional: VoiceAgent ID for fresh/fresh-na contacts
  followup_agent_id?: string; // Optional: VoiceAgent ID for follow-up contacts
  tag_filter?: string; // NEW: Phase 1 tag filter (e.g., "fresh", "Follow-up")
  contact_ids?: string[]; // Keep for backward compat
  max_contacts?: number; // NEW: Limit number of contacts
  phone_number_id?: string; // VAPI phone number ID to use as caller ID
}

/**
 * Campaign report data
 */
export interface CampaignReport {
  total_calls: number;
  successful_calls?: number; // Number of answered calls
  success_rate: number;
  avg_duration: number; // in seconds
  total_duration?: string; // formatted duration
  total_cost?: number;
  conversion_rate?: number;
  intent_breakdown?: Record<string, number>; // Intent classification counts
  calls_by_date?: Array<{ date: string; count: number }>; // Daily call counts
  generated_at?: string; // ISO timestamp
}

/**
 * Response from batch call initiation
 */
export interface BatchCallResponse {
  job_id?: string; // Campaign job ID for WebSocket tracking
  status?: string; // Campaign status: "running", "stopped", etc.
  total_contacts?: number; // Total contacts in campaign
  message?: string; // Status message
  total: number;
  triggered: number;
  failed: number;
  calls_initiated?: number; // Alternative field name
  errors?: string[];
}

/**
 * Start a batch campaign to call multiple contacts
 *
 * Phase 1: Now supports tag_filter for automatic contact selection.
 * If tag_filter is provided, backend will automatically select contacts.
 * If contact_ids is provided, uses explicit contact list (backward compat).
 *
 * @param data - Batch call request with agent_id and optional tag_filter/max_contacts
 * @returns Batch call response with success/failure counts
 * @throws Error if the batch call fails
 */
export async function startBatchCampaign(
  data: BatchCallRequest
): Promise<BatchCallResponse> {
  return authFetchJson<BatchCallResponse>("/api/campaigns/batch-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Get campaign report data
 * @param type - Campaign type: "outbound" or "inbound"
 * @param days - Number of days to look back (default 30, max 90)
 * @returns Campaign report with analytics
 */
export async function getCampaignReport(
  type: "outbound" | "inbound",
  days: number = 30
): Promise<CampaignReport> {
  return authFetchJson<CampaignReport>(`/api/campaigns/report?type=${type}&days=${days}`);
}

/**
 * Agent-specific report data
 */
export interface AgentReport {
  agent: {
    id: string;
    name: string;
    agent_type: string;
  };
  period_days: number;
  total_calls: number;
  successful_calls: number;
  success_rate: number;
  avg_duration: number;
  intent_breakdown: Record<string, number>;
  outcome_breakdown: Record<string, number>;
  calls_by_date: Array<{ date: string; count: number }>;
  recent_calls: Array<{
    id: string;
    contact_name: string;
    date: string;
    duration: string;
    outcome: string;
    intent: string | null;
  }>;
  generated_at: string;
}

/**
 * Get agent-specific report data
 * @param agentId - Voice agent database ID
 * @param days - Number of days to look back (default 30, max 90)
 * @returns Agent report with analytics
 */
export async function getAgentReport(
  agentId: string,
  days: number = 30
): Promise<AgentReport> {
  return authFetchJson<AgentReport>(`/api/campaigns/agent/${agentId}/report?days=${days}`);
}

