/**
 * Contacts API using Bolna executions directly
 * No backend or localStorage - fetches fresh data from Bolna API on every load
 */
import { executionsApi, agentApi, BolnaExecution } from "@/lib/bolnaApi";

// Types
export interface CallHistoryItem {
  id: string;
  date: string;
  duration: number;
  status: string;
  type: 'inbound' | 'outbound';
  intent?: string;
  summary: string;
  transcript?: string;
  recording_url?: string;
  cost?: number;
  agent_name?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  normalized_phone: string;
  company_name?: string;
  tag: string;
  source: string;
  lead_score?: number;
  conversion_probability?: number;
  last_contacted_at?: string;
  last_call_date?: string;
  callback_date?: string;
  no_answer_count: number;
  last_call_summary?: string;
  purchased_package?: string;
  call_count: number;
  total_call_duration: number;
  call_history: CallHistoryItem[];
  is_manual_status: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ContactFilter {
  tag?: string[];
  source?: string[];
  search?: string;
  created_after?: string;
  created_before?: string;
}

// Status mapping from execution to contact tag
function mapExecutionToStatus(execution: BolnaExecution): string {
  const { status, extracted_data, transcript } = execution;

  const intent = extracted_data?.intent?.toLowerCase() || "";
  const transcriptLower = transcript?.toLowerCase() || "";

  if (status === "completed") {
    if (intent.includes("booked") || intent.includes("purchased") ||
      transcriptLower.includes("book") || transcriptLower.includes("purchase")) {
      return "purchased";
    }
    if (intent.includes("converted") || transcriptLower.includes("interested") ||
      transcriptLower.includes("yes")) {
      return "converted";
    }
    if (intent.includes("not_interested") || transcriptLower.includes("not interested")) {
      return "not_interested";
    }
    if (intent.includes("follow_up") || transcriptLower.includes("call back")) {
      return "follow_up_interested";
    }
    return "converted";
  }

  if (status === "no-answer" || status === "busy" || status === "call-disconnected" ||
    status === "failed" || status === "canceled") {
    return "fresh_na";
  }

  return "fresh";
}

// Extract name from execution
function extractName(execution: BolnaExecution): string {
  if (execution.extracted_data?.name) {
    return execution.extracted_data.name;
  }
  const phone = execution.telephony_data?.to_number || "";
  return `Contact ${phone.slice(-4)}`;
}

// Extract intent
function extractIntent(execution: BolnaExecution): string | undefined {
  if (execution.extracted_data?.intent) {
    return execution.extracted_data.intent;
  }
  const transcript = execution.transcript || "";
  if (transcript.match(/book|purchase|buy/i)) return "booking_intent";
  if (transcript.match(/interested|yes|sure/i)) return "interested";
  if (transcript.match(/not interested|no thanks|decline/i)) return "not_interested";
  if (transcript.match(/call back|follow up|later/i)) return "follow_up";
  return undefined;
}

// Extract summary (first 200 chars)
function extractSummary(execution: BolnaExecution): string {
  const transcript = execution.transcript || "";
  if (transcript.length <= 200) return transcript;
  return transcript.substring(0, 200) + "...";
}

// Convert execution to CallHistoryItem
function executionToCallHistory(execution: BolnaExecution): CallHistoryItem {
  return {
    id: execution.id,
    date: execution.created_at,
    duration: execution.conversation_time || 0,
    status: execution.status,
    type: execution.telephony_data?.call_type || "outbound",
    intent: extractIntent(execution),
    summary: extractSummary(execution),
    transcript: execution.transcript,
    recording_url: execution.telephony_data?.recording_url,
    cost: execution.total_cost,
    agent_name: execution.agent_id,
  };
}

// Transform executions to contacts (group by phone)
function transformExecutionsToContacts(executions: BolnaExecution[]): Contact[] {
  const executionsByPhone: Map<string, BolnaExecution[]> = new Map();

  // Group executions by phone number
  for (const execution of executions) {
    const phone = execution.telephony_data?.to_number;
    if (!phone) continue;

    const normalizedPhone = phone.replace(/\D/g, "");
    if (!executionsByPhone.has(normalizedPhone)) {
      executionsByPhone.set(normalizedPhone, []);
    }
    executionsByPhone.get(normalizedPhone)!.push(execution);
  }

  // Transform each group into a contact
  const contacts: Contact[] = [];

  for (const [normalizedPhone, phoneExecutions] of executionsByPhone) {
    // Sort by date (newest first)
    phoneExecutions.sort((a: BolnaExecution, b: BolnaExecution) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const mostRecent = phoneExecutions[0];
    const firstExecution = phoneExecutions[phoneExecutions.length - 1];

    // Calculate metrics
    const callCount = phoneExecutions.length;
    const totalDuration = phoneExecutions.reduce((sum: number, ex: BolnaExecution) => sum + (ex.conversation_time || 0), 0);
    const lastCallDate = mostRecent.created_at;

    // Build call history (last 10 calls)
    const callHistory: CallHistoryItem[] = phoneExecutions
      .slice(0, 10)
      .map(executionToCallHistory);

    // Determine status from most recent call
    const status = mapExecutionToStatus(mostRecent);
    const source = mostRecent.telephony_data?.call_type === "inbound" ? "bolna_inbound" : "bolna_outbound";

    const contact: Contact = {
      id: normalizedPhone, // Use phone as ID since no backend
      name: extractName(firstExecution),
      email: `${normalizedPhone}@placeholder.com`,
      phone: mostRecent.telephony_data?.to_number || normalizedPhone,
      normalized_phone: normalizedPhone,
      tag: status,
      source: source,
      no_answer_count: phoneExecutions.filter((ex: BolnaExecution) => ex.status === "no-answer").length,
      last_call_summary: extractSummary(mostRecent),
      last_call_date: lastCallDate,
      call_count: callCount,
      total_call_duration: totalDuration,
      call_history: callHistory,
      is_manual_status: false,
      last_sync_at: new Date().toISOString(),
      created_at: firstExecution.created_at,
      updated_at: mostRecent.created_at,
    };

    contacts.push(contact);
  }

  return contacts;
}

/**
 * Contacts API - Fetches directly from Bolna, no backend storage
 */
export const contactsApi = {
  /**
   * Get all contacts by fetching executions from Bolna API
   * Transforms executions into contact format grouped by phone number
   */
  async getContacts(
    page: number = 1,
    pageSize: number = 50,
    filters?: ContactFilter
  ): Promise<PaginatedResponse<Contact>> {
    try {
      // 1. Fetch all agents first
      const agents = await agentApi.getAll();

      // 2. Fetch both inbound and outbound executions for each agent
      // Bolna API requires separate calls for each call_type
      const executionsPromises = agents.map(async agent => {
        // Fetch outbound calls
        const outboundPromise = executionsApi.getByAgent(agent.id, {
          page_number: 1,
          page_size: 100,
          call_type: 'outbound',
          from: filters?.created_after,
          to: filters?.created_before,
        }).then(res => res.data || []).catch(() => []);

        // Fetch inbound calls
        const inboundPromise = executionsApi.getByAgent(agent.id, {
          page_number: 1,
          page_size: 100,
          call_type: 'inbound',
          from: filters?.created_after,
          to: filters?.created_before,
        }).then(res => res.data || []).catch(() => []);

        // Wait for both and merge
        const [outbound, inbound] = await Promise.all([outboundPromise, inboundPromise]);
        return [...outbound, ...inbound];
      });

      const results = await Promise.all(executionsPromises);
      const allExecutions = results.flatMap(r => r);

      // 3. Transform to contacts (group by phone)
      let contacts = transformExecutionsToContacts(allExecutions);

      // 4. Apply filters
      if (filters?.tag?.length) {
        contacts = contacts.filter(c => filters.tag!.includes(c.tag));
      }

      if (filters?.source?.length) {
        contacts = contacts.filter(c => filters.source!.includes(c.source));
      }

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        contacts = contacts.filter(c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.phone.includes(searchLower)
        );
      }

      // 5. Calculate pagination locally
      const total = contacts.length;
      const totalPages = Math.ceil(total / pageSize);
      const startIndex = (page - 1) * pageSize;
      const paginatedContacts = contacts.slice(startIndex, startIndex + pageSize);

      return {
        items: paginatedContacts,
        total,
        page,
        page_size: pageSize,
        total_pages: totalPages,
      };
    } catch (error) {
      console.error("Error fetching contacts from Bolna:", error);
      throw error;
    }
  },

  /**
   * Get single contact by ID (phone number)
   */
  async getContact(contactId: string): Promise<Contact> {
    const allContacts = await this.getContacts(1, 1000);
    const contact = allContacts.items.find(c => c.id === contactId);
    if (!contact) {
      throw new Error("Contact not found");
    }
    return contact;
  },

  /**
   * Export contacts to CSV
   * Since we don't have a backend, we'll generate CSV client-side
   */
  async exportContacts(filters?: ContactFilter): Promise<Blob> {
    const response = await this.getContacts(1, 10000, filters);
    const contacts = response.items;

    // Generate CSV
    const headers = ["Name", "Phone", "Email", "Status", "Source", "Calls", "Duration", "Last Called"];
    const rows = contacts.map(c => [
      c.name,
      c.phone,
      c.email,
      c.tag,
      c.source,
      c.call_count,
      c.total_call_duration,
      c.last_call_date,
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    return new Blob([csv], { type: "text/csv" });
  },

  /**
   * Get contact statistics
   */
  async getStats() {
    const response = await this.getContacts(1, 10000);
    const contacts = response.items;

    const byTag: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    contacts.forEach(c => {
      byTag[c.tag] = (byTag[c.tag] || 0) + 1;
      bySource[c.source] = (bySource[c.source] || 0) + 1;
    });

    const converted = (byTag["purchased"] || 0) + (byTag["converted"] || 0);
    const total = contacts.length;

    return {
      total_contacts: total,
      by_tag: byTag,
      by_source: bySource,
      conversion_rate: total > 0 ? (converted / total) * 100 : 0,
    };
  },
};
