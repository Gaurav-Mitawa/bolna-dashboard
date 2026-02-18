/**
 * Campaigns API client (v2 modular backend).
 * Matches app/routers/campaigns_modular/ endpoints.
 */
import { apiClientV2, ApiResponse } from '../shared/baseClient';

export interface CampaignStartRequest {
  contact_ids?: string[];
  agent_id?: string;
  main_agent_id?: string;
  followup_agent_id?: string;
  tag_filter?: string;
  max_contacts?: number;
  phone_number_id?: string;
}

export interface CampaignResponse {
  id: string;
  user_id: string;
  agent_id: string;
  status: string;
  started_at: string;
  stopped_at?: string;
  total_calls: number;
  options: Record<string, any>;
}

export interface CampaignCounters {
  pending: number;
  locked: number;
  call_requested: number;
  ringing_or_queued: number;
  in_call: number;
  call_ended: number;
  analysis_ready: number;
  completed: number;
  no_answer: number;
  failed: number;
  retry_scheduled: number;
  cancelled: number;
  skipped: number;
}

export interface CampaignReport {
  job_id: string;
  agent_name: string;
  status: string;
  total_contacts: number;
  calls_made: number;
  answered: number;
  no_answer: number;
  voicemail: number;
  busy: number;
  failed: number;
  bookings_created: number;
  avg_call_duration: number;
  total_cost: number;
  started_at: string;
  stopped_at?: string;
}

export const campaignsApi = {
  /**
   * Start new campaign.
   */
  async startCampaign(data: CampaignStartRequest): Promise<CampaignResponse> {
    const response = await apiClientV2.post<CampaignResponse>('/campaigns-v2/start', data);
    return response.data;
  },

  /**
   * Batch call (legacy endpoint for compatibility).
   */
  async batchCall(data: CampaignStartRequest): Promise<CampaignResponse> {
    const response = await apiClientV2.post<CampaignResponse>('/campaigns-v2/batch-call', data);
    return response.data;
  },

  /**
   * Stop running campaign.
   */
  async stopCampaign(jobId: string): Promise<ApiResponse<void>> {
    const response = await apiClientV2.post<ApiResponse<void>>(`/campaigns-v2/stop-campaign/${jobId}`);
    return response.data;
  },

  /**
   * Get real-time campaign counters.
   */
  async getCampaignCounters(jobId: string): Promise<CampaignCounters> {
    const response = await apiClientV2.get<CampaignCounters>(`/campaigns-v2/${jobId}/counters`);
    return response.data;
  },

  /**
   * Get campaign report.
   */
  async getCampaignReport(jobId?: string): Promise<CampaignReport> {
    const url = jobId ? `/campaigns-v2/report?campaign_id=${jobId}` : '/campaigns-v2/report';
    const response = await apiClientV2.get<CampaignReport>(url);
    return response.data;
  },

  /**
   * Get agent-specific campaign report.
   */
  async getAgentReport(agentId: string): Promise<CampaignReport> {
    const response = await apiClientV2.get<CampaignReport>(`/campaigns-v2/agent/${agentId}/report`);
    return response.data;
  },

  /**
   * Trigger single call for a contact in campaign.
   */
  async triggerSingleCall(campaignId: string, contactId: string): Promise<ApiResponse<void>> {
    const response = await apiClientV2.post<ApiResponse<void>>(
      `/campaigns-v2/campaigns/${campaignId}/contacts/${contactId}/call`
    );
    return response.data;
  },
};

