/**
 * Campaigns API Service - Bolna Integration
 * Manages outbound call campaigns using Bolna Batches API directly
 */
import { agentApi, batchesApi, executionsApi, BolnaBatch } from "@/lib/bolnaApi";
import { contactsApi } from "@/api/bolnaContacts";

export interface Campaign {
  id: string;
  agentId: string;
  agentName: string;
  status: "scheduled" | "created" | "queued" | "executing" | "executed" | "running" | "stopped";
  statusTag: string[]; // Target customer statuses
  fromPhoneNumber: string;
  fileName: string;
  validContacts: number;
  totalContacts: number;
  createdAt: string;
  scheduledAt?: string;
  updatedAt?: string;
  executionStatus: Record<string, number>;
  isActive: boolean;
}

export type CallType = "outbound" | "inbound";

export interface CampaignAnalytics {
  callIntent: {
    // Outbound categories
    booked: number;
    notInterested: number;
    followUp: number;
    // Inbound categories
    cancelled: number;
    queries: number;
    total: number;
  };
  callStatus: {
    // Outbound categories
    answered: number;
    notAnswered: number;
    // Inbound categories
    officeHours: number;
    nonOfficeHours: number;
    total: number;
  };
  dateRange: {
    from: string;
    to: string;
  };
  callType: CallType;
}

export interface CreateCampaignData {
  agentId: string;
  file: File;
  fromPhoneNumber: string;
  statusTags: string[]; // Target customer statuses
  retryConfig?: {
    enabled: boolean;
    max_retries: number;
    retry_intervals_minutes: number[];
  };
}

/**
 * Fetch all campaigns across all agents
 */
export async function getAllCampaigns(): Promise<Campaign[]> {
  try {
    // 1. Get all agents
    const agents = await agentApi.getAll();

    // 2. Fetch batches for each agent
    const campaignPromises = agents.map(async (agent) => {
      try {
        const batches = await batchesApi.getByAgent(agent.id);

        // Transform batches to campaigns
        return batches.map((batch: BolnaBatch) => {
          const status = batch.status as Campaign["status"] || "created";
          return {
            id: batch.batch_id,
            agentId: agent.id,
            agentName: agent.agent_name,
            status,
            statusTag: [],
            fromPhoneNumber: batch.from_phone_number || "",
            fileName: batch.file_name || "contacts.csv",
            validContacts: batch.valid_contacts || 0,
            totalContacts: batch.total_contacts || 0,
            createdAt: batch.created_at,
            scheduledAt: batch.scheduled_at,
            updatedAt: batch.updated_at,
            executionStatus: batch.execution_status || {},
            isActive: status === "queued" || status === "executing" || status === "running" || status === "executed",
          };
        });
      } catch (error) {
        console.error(`Error fetching batches for agent ${agent.id}:`, error);
        return [];
      }
    });

    const campaignsArrays = await Promise.all(campaignPromises);
    return campaignsArrays.flat();
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    throw error;
  }
}

/**
 * Get campaign analytics with inbound/outbound support
 */
export async function getCampaignAnalytics(
  from?: string,
  to?: string,
  callType?: CallType
): Promise<CampaignAnalytics> {
  try {
    // Fetch executions for analytics with call_type filter
    const params: any = {
      from,
      to,
      page_size: 1000,
    };

    // Add call_type filter if specified
    if (callType) {
      params.call_type = callType;
    }

    const executionsResponse = await executionsApi.getAll(params);
    const executions = executionsResponse.data || [];

    // Initialize counters
    let booked = 0;
    let notInterested = 0;
    let followUp = 0;
    let cancelled = 0;
    let queries = 0;
    let answered = 0;
    let notAnswered = 0;
    let officeHours = 0;
    let nonOfficeHours = 0;

    executions.forEach((execution) => {
      const executionCallType = execution.telephony_data?.call_type || "outbound";
      const callHour = new Date(execution.created_at).getHours();
      const isOfficeHours = callHour >= 9 && callHour < 17; // 9 AM to 5 PM

      // Intent from extracted_data or transcript
      const intent = execution.extracted_data?.intent?.toLowerCase() || "";
      const transcript = execution.transcript?.toLowerCase() || "";

      if (executionCallType === "inbound") {
        // Inbound Call Intent: Booked, Cancelled, Queries
        if (intent.includes("book") || intent.includes("purchase") ||
          transcript.includes("book") || transcript.includes("purchase")) {
          booked++;
        } else if (intent.includes("cancel") || transcript.includes("cancel")) {
          cancelled++;
        } else if (intent.includes("query") || intent.includes("question") ||
          transcript.includes("query") || transcript.includes("question")) {
          queries++;
        } else {
          // Default to queries if no specific intent found
          queries++;
        }

        // Inbound Call Status: Office Hours, Non-Office Hours
        if (isOfficeHours) {
          officeHours++;
        } else {
          nonOfficeHours++;
        }
      } else {
        // Outbound Call Intent: Booked, Not Interested, Follow-up
        if (intent.includes("book") || intent.includes("purchase") ||
          transcript.includes("book") || transcript.includes("purchase")) {
          booked++;
        } else if (intent.includes("not_interested") || transcript.includes("not interested")) {
          notInterested++;
        } else if (intent.includes("follow_up") || transcript.includes("call back")) {
          followUp++;
        } else {
          // Check for other indicators
          if (transcript.includes("call me back") || transcript.includes("later")) {
            followUp++;
          } else if (transcript.includes("no") || transcript.includes("not")) {
            notInterested++;
          }
        }

        // Outbound Call Status: Answered, Not Answered
        if (execution.status === "completed") {
          answered++;
        } else if (["no-answer", "busy", "failed", "call-disconnected", "canceled"].includes(execution.status)) {
          notAnswered++;
        }
      }
    });

    return {
      callIntent: {
        booked,
        notInterested,
        followUp,
        cancelled,
        queries,
        total: executions.length,
      },
      callStatus: {
        answered,
        notAnswered,
        officeHours,
        nonOfficeHours,
        total: executions.length,
      },
      dateRange: {
        from: from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: to || new Date().toISOString(),
      },
      callType: callType || "outbound",
    };
  } catch (error) {
    console.error("Error fetching campaign analytics:", error);
    // Return empty analytics on error
    return {
      callIntent: { booked: 0, notInterested: 0, followUp: 0, cancelled: 0, queries: 0, total: 0 },
      callStatus: { answered: 0, notAnswered: 0, officeHours: 0, nonOfficeHours: 0, total: 0 },
      dateRange: { from: "", to: "" },
      callType: callType || "outbound",
    };
  }
}

/**
 * Create a new campaign (batch)
 */
export async function createCampaign(data: CreateCampaignData): Promise<Campaign> {
  try {
    const formData = new FormData();
    formData.append("agent_id", data.agentId);
    formData.append("file", data.file);
    formData.append("from_phone_number", data.fromPhoneNumber);

    if (data.retryConfig) {
      formData.append("retry_config", JSON.stringify(data.retryConfig));
    }

    // Use fetch directly since we need FormData
    const apiKey = import.meta.env.BOLNA_API_KEY || import.meta.env.VITE_BOLNA_API_KEY;
    const response = await fetch("https://api.bolna.ai/batches", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    const result = await response.json();

    // Get agent details for the campaign
    const agent = await agentApi.get(data.agentId);

    return {
      id: result.batch_id,
      agentId: data.agentId,
      agentName: agent.agent_name,
      status: "created",
      statusTag: data.statusTags,
      fromPhoneNumber: data.fromPhoneNumber,
      fileName: data.file.name,
      validContacts: 0,
      totalContacts: 0,
      createdAt: new Date().toISOString(),
      executionStatus: {},
      isActive: false,
    };
  } catch (error) {
    console.error("Error creating campaign:", error);
    throw error;
  }
}

/**
 * Get campaign details
 */
export async function getCampaignDetails(batchId: string): Promise<Campaign> {
  try {
    const batch = await batchesApi.get(batchId);

    // Get agent details
    let agentName = "Unknown";
    try {
      const agent = await agentApi.get(batch.agent_id || "");
      agentName = agent.agent_name;
    } catch {
      // Agent might be deleted
    }

    const status = batch.status as Campaign["status"] || "created";

    return {
      id: batch.batch_id,
      agentId: batch.agent_id || "",
      agentName,
      status,
      statusTag: [],
      fromPhoneNumber: batch.from_phone_number || "",
      fileName: batch.file_name || "contacts.csv",
      validContacts: batch.valid_contacts || 0,
      totalContacts: batch.total_contacts || 0,
      createdAt: batch.created_at,
      scheduledAt: batch.scheduled_at,
      updatedAt: batch.updated_at,
      executionStatus: batch.execution_status || {},
      isActive: status === "queued" || status === "executing" || status === "running" || status === "executed",
    };
  } catch (error) {
    console.error("Error fetching campaign details:", error);
    throw error;
  }
}

/**
 * Stop/pause a campaign
 */
export async function stopCampaign(batchId: string): Promise<void> {
  try {
    await batchesApi.stop(batchId);
  } catch (error) {
    console.error("Error stopping campaign:", error);
    throw error;
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(batchId: string): Promise<void> {
  try {
    await batchesApi.delete(batchId);
  } catch (error) {
    console.error("Error deleting campaign:", error);
    throw error;
  }
}

/**
 * Resume a campaign (schedule it)
 */
export async function resumeCampaign(
  batchId: string,
  scheduledAt?: string
): Promise<void> {
  try {
    // If scheduled time provided, schedule it; otherwise start immediately
    if (scheduledAt) {
      await batchesApi.schedule(batchId, scheduledAt);
    } else {
      // For immediate resume, we might need to recreate or use a different endpoint
      // This depends on Bolna API capabilities
      console.log("Resuming campaign immediately:", batchId);
    }
  } catch (error) {
    console.error("Error resuming campaign:", error);
    throw error;
  }
}

/**
 * Generate CSV from filtered customers
 */
export async function generateCSVFromCustomers(
  statusTags: string[]
): Promise<Blob> {
  try {
    // Fetch all contacts
    const response = await contactsApi.getContacts(1, 10000);
    const contacts = response.items;

    // Filter by status tags
    const filteredContacts = contacts.filter((contact) =>
      statusTags.includes(contact.tag)
    );

    // Generate CSV
    const headers = ["phone_number", "name"];
    const rows = filteredContacts.map((contact) => [
      contact.phone,
      contact.name,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    return new Blob([csv], { type: "text/csv" });
  } catch (error) {
    console.error("Error generating CSV:", error);
    throw error;
  }
}

/**
 * Download CSV template
 */
export function downloadCSVTemplate(): void {
  const headers = ["phone_number", "name", "custom_var_1", "custom_var_2"];
  const example = ["+1234567890", "John Doe", "value1", "value2"];

  const csv = [headers.join(","), example.join(",")].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "campaign_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
