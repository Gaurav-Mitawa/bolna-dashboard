/**
 * Inbound Receptionist API
 * Functions for configuring and managing AI receptionist
 */

import { authFetchJson } from "@/lib/api";

/**
 * Inbound configuration request
 */
export interface InboundConfigRequest {
  agent_id: string; // VoiceAgent database ID
  phone_number_id: string; // VAPI phone number ID
}

/**
 * Inbound configuration response
 */
export interface InboundConfigResponse {
  id: string;
  agent_id: string;
  agent_name: string;
  phone_number_id: string;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current user's inbound receptionist configuration
 * @returns Inbound configuration or null if not configured
 */
export async function getInboundConfig(): Promise<InboundConfigResponse | null> {
  try {
    return await authFetchJson<InboundConfigResponse>("/api/inbound/config");
  } catch (error: any) {
    // Return null if config doesn't exist (404)
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create or update the user's inbound receptionist configuration
 * @param config - Inbound configuration with agent_id and phone_number_id
 * @returns Updated configuration
 */
export async function updateInboundConfig(
  config: InboundConfigRequest
): Promise<InboundConfigResponse> {
  return authFetchJson<InboundConfigResponse>("/api/inbound/config", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });
}

