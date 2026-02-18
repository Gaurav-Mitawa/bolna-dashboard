/**
 * Analytics API client (v2 modular backend).
 * Matches app/routers/analytics.py endpoints.
 */
import { apiClientV2 } from '../shared/baseClient';

export interface DashboardStats {
  total_contacts: number;
  total_campaigns: number;
  total_calls: number;
  total_bookings: number;
  conversion_rate: number;
  avg_call_duration: number;
}

export interface CallAnalytics {
  total_calls: number;
  answered: number;
  no_answer: number;
  voicemail: number;
  busy: number;
  failed: number;
  avg_duration: number;
  total_cost: number;
}

export interface CampaignAnalytics {
  total_campaigns: number;
  active: number;
  completed: number;
  total_contacts_reached: number;
  conversion_rate: number;
}

export const analyticsApi = {
  /**
   * Get dashboard statistics.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClientV2.get<DashboardStats>('/analytics/dashboard');
    return response.data;
  },

  /**
   * Get call analytics.
   */
  async getCallAnalytics(startDate?: string, endDate?: string): Promise<CallAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiClientV2.get<CallAnalytics>(`/analytics/calls?${params}`);
    return response.data;
  },

  /**
   * Get campaign analytics.
   */
  async getCampaignAnalytics(startDate?: string, endDate?: string): Promise<CampaignAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiClientV2.get<CampaignAnalytics>(`/analytics/campaigns?${params}`);
    return response.data;
  },

  /**
   * Get booking analytics.
   */
  async getBookingAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    
    const response = await apiClientV2.get(`/analytics/bookings?${params}`);
    return response.data;
  },
};

