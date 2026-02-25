/**
 * Bolna Sync Service
 * Syncs contacts from Bolna API executions to local contacts database
 * Maps call outcomes to contact statuses with call history
 */

import { executionsApi, BolnaExecution } from "@/lib/bolnaApi";
import { contactsApi, CallHistoryItem } from "@/api/v2/contacts";
import type { LeadTag } from "@/types";

export type BolnaSource = "bolna_inbound" | "bolna_outbound";

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Map Bolna execution outcome to contact status tag
 * Updated based on last call - status can change based on most recent call outcome
 */
function mapExecutionToStatus(execution: BolnaExecution): LeadTag {
  const { status, extracted_data, transcript, answered_by_voice_mail } = execution;

  // Check extracted data for intent
  const intent = extracted_data?.intent?.toLowerCase() || "";
  const transcriptLower = transcript?.toLowerCase() || "";

  // Call completed successfully
  if (status === "completed") {
    // Check for booking/purchase
    if (
      intent.includes("booked") ||
      intent.includes("purchased") ||
      transcriptLower.includes("book") ||
      transcriptLower.includes("purchase")
    ) {
      return "purchased";
    }

    // Check for conversion
    if (
      intent.includes("converted") ||
      transcriptLower.includes("interested") ||
      transcriptLower.includes("yes")
    ) {
      return "converted";
    }

    // Check for not interested
    if (
      intent.includes("not_interested") ||
      transcriptLower.includes("not interested") ||
      transcriptLower.includes("no thanks")
    ) {
      return "not_interested";
    }

    // Check for follow-up needed
    if (
      intent.includes("follow_up") ||
      transcriptLower.includes("call back") ||
      transcriptLower.includes("follow up")
    ) {
      return "follow_up_interested";
    }

    // Voicemail detected
    if (answered_by_voice_mail) {
      return "fresh_na";
    }

    // Default for completed calls without clear outcome
    return "converted";
  }

  // No answer - mark as Fresh-NA for retry
  if (status === "no-answer" || status === "busy") {
    return "fresh_na";
  }

  // Call disconnected quickly (less than 30 seconds)
  if (status === "call-disconnected") {
    return "fresh_na";
  }

  // Failed calls
  if (status === "failed" || status === "canceled") {
    return "fresh_na";
  }

  // Default for other statuses
  return "fresh";
}

/**
 * Extract name from execution data
 */
function extractName(execution: BolnaExecution): string {
  // Try to get name from extracted_data
  if (execution.extracted_data?.name) {
    return execution.extracted_data.name;
  }

  // Try to parse from transcript
  const transcript = execution.transcript || "";
  const nameMatch = transcript.match(/my name is (\w+)/i);
  if (nameMatch) {
    return nameMatch[1];
  }

  // Default to phone number-based name
  const phone = execution.telephony_data?.to_number || "";
  return `Contact ${phone.slice(-4)}`;
}

/**
 * Extract email from execution data
 */
function extractEmail(execution: BolnaExecution): string | undefined {
  if (execution.extracted_data?.email) {
    return execution.extracted_data.email;
  }

  // Try to parse from transcript
  const transcript = execution.transcript || "";
  const emailMatch = transcript.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) {
    return emailMatch[0];
  }

  return undefined;
}

/**
 * Extract intent from execution data
 */
function extractIntent(execution: BolnaExecution): string | undefined {
  // Try extracted_data first
  if (execution.extracted_data?.intent) {
    return execution.extracted_data.intent;
  }

  // Try to parse from transcript
  const transcript = execution.transcript || "";

  // Common intent patterns
  if (transcript.match(/book|purchase|buy/i)) return "booking_intent";
  if (transcript.match(/interested|yes|sure/i)) return "interested";
  if (transcript.match(/not interested|no thanks|decline/i))
    return "not_interested";
  if (transcript.match(/call back|follow up|later/i)) return "follow_up";

  return undefined;
}

/**
 * Extract summary from transcript (first 200 chars)
 */
function extractSummary(execution: BolnaExecution): string {
  const transcript = execution.transcript || "";
  if (transcript.length <= 200) return transcript;
  return transcript.substring(0, 200) + "...";
}

/**
 * Convert execution to CallHistoryItem
 */
function executionToCallHistory(execution: BolnaExecution): CallHistoryItem {
  return {
    id: execution.id,
    date: execution.created_at,
    duration: execution.conversation_time || 0,
    status: execution.status,
    type: execution.telephony_data?.call_type || "outbound",
    intent: extractIntent(execution),
    summary: extractSummary(execution),
    recording_url: execution.telephony_data?.recording_url,
    cost: execution.total_cost,
    agent_name: execution.agent_id, // Could be enhanced to fetch agent name
  };
}

/**
 * Find contact by phone number
 */
async function findContactByPhone(
  phone: string
): Promise<{ id: string; is_manual_status: boolean } | null> {
  try {
    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, "");

    // Search in contacts
    const response = await contactsApi.getContacts(1, 100, {
      search: normalizedPhone,
    });

    // Find exact match
    const contact = response.items.find(
      (c) => c.phone.replace(/\D/g, "") === normalizedPhone
    );

    return contact
      ? { id: contact.id, is_manual_status: contact.is_manual_status }
      : null;
  } catch (error) {
    console.error("Error finding contact:", error);
    return null;
  }
}

/**
 * Sync contacts from Bolna executions
 * Enhanced version with call history and aggregated metrics
 * @param from - Start date (ISO string, optional - defaults to all time)
 * @param to - End date (ISO string, optional - defaults to now)
 * @returns SyncResult with counts
 */
export async function syncContactsFromBolna(
  from?: string,
  to?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    console.log("🔄 Starting Bolna sync...", { from, to });

    // Fetch all executions (all time if no date range specified)
    const executionsResponse = await executionsApi.getAll({
      page_size: 1000,
      from: from, // undefined = all time
      to: to || new Date().toISOString(),
    });

    const executions = executionsResponse.data || [];
    console.log(`📞 Found ${executions.length} executions`);

    // Group executions by phone number
    const executionsByPhone: Map<string, BolnaExecution[]> = new Map();

    for (const execution of executions) {
      const phone = execution.telephony_data?.to_number;
      if (!phone) {
        result.skipped++;
        continue;
      }

      const normalizedPhone = phone.replace(/\D/g, "");
      if (!executionsByPhone.has(normalizedPhone)) {
        executionsByPhone.set(normalizedPhone, []);
      }
      executionsByPhone.get(normalizedPhone)!.push(execution);
    }

    console.log(`👥 Processing ${executionsByPhone.size} unique contacts`);

    // Process each phone number group
    for (const [normalizedPhone, phoneExecutions] of executionsByPhone) {
      try {
        // Sort by date descending (newest first)
        phoneExecutions.sort(
          (a: BolnaExecution, b: BolnaExecution) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Get most recent execution for status determination
        const mostRecentExecution = phoneExecutions[0];
        const callType = mostRecentExecution.telephony_data?.call_type;
        const source: BolnaSource =
          callType === "inbound" ? "bolna_inbound" : "bolna_outbound";

        // Calculate aggregated metrics
        const callCount = phoneExecutions.length;
        const totalDuration = phoneExecutions.reduce(
          (sum: number, ex: BolnaExecution) => sum + (ex.conversation_time || 0),
          0
        );
        const lastCallDate = phoneExecutions[0].created_at;

        // Build call history (last 10 calls)
        const callHistory: CallHistoryItem[] = phoneExecutions
          .slice(0, 10)
          .map(executionToCallHistory);

        // Determine status based on most recent call
        const newStatus = mapExecutionToStatus(mostRecentExecution);

        // Check if contact exists
        const existingContact = await findContactByPhone(normalizedPhone);

        if (existingContact) {
          // Update existing contact
          const updateData: any = {
            call_count: callCount,
            total_call_duration: totalDuration,
            last_call_date: lastCallDate,
            call_history: callHistory,
            last_sync_at: new Date().toISOString(),
          };

          // Only update status if not manually set
          if (!existingContact.is_manual_status) {
            updateData.tag = newStatus;
            updateData.last_call_summary = extractSummary(mostRecentExecution);
          }

          await contactsApi.updateContact(existingContact.id, updateData);
          result.updated++;
          console.log(`✅ Updated contact: ${normalizedPhone} (${callCount} calls)`);
        } else {
          // Create new contact
          const firstExecution = phoneExecutions[phoneExecutions.length - 1]; // Oldest

          await contactsApi.createContact({
            name: extractName(firstExecution),
            phone: normalizedPhone,
            email:
              extractEmail(firstExecution) ||
              `${normalizedPhone}@placeholder.com`,
            tag: newStatus,
            source: source,
            call_count: callCount,
            total_call_duration: totalDuration,
            call_history: callHistory,
            is_manual_status: false,
          });
          result.created++;
          console.log(`✨ Created contact: ${normalizedPhone} (${callCount} calls)`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${normalizedPhone}:`, error);
        result.errors++;
      }
    }

    console.log("✅ Sync complete:", result);
    return result;
  } catch (error) {
    console.error("❌ Sync error:", error);
    throw error;
  }
}

/**
 * Hook to sync on mount
 */
export function useBolnaSync() {
  return {
    syncContactsFromBolna,
  };
}
