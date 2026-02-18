/**
 * Contacts API client (v2 modular backend).
 * Matches app/routers/contacts.py endpoints.
 */
import { apiClientV2, ApiResponse, PaginatedResponse } from '../shared/baseClient';

// Types matching backend schemas
export interface CallHistoryItem {
  id: string;
  date: string;
  duration: number;
  status: string;
  type: 'inbound' | 'outbound';
  intent?: string;
  summary: string;
  recording_url?: string;
  cost?: number;
  agent_name?: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  normalized_phone: string;
  company_name?: string;
  tag: string;
  source: string;
  pms_data?: Record<string, any>;
  lead_score?: number;
  conversion_probability?: number;
  last_contacted_at?: string;
  last_call_date?: string;
  callback_date?: string;
  no_answer_count: number;
  last_call_summary?: string;
  purchased_package?: string;
  // New fields for call tracking
  call_count: number;
  total_call_duration: number;
  call_history: CallHistoryItem[];
  is_manual_status: boolean;
  last_sync_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface ContactCreate {
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  tag?: string;
  source?: string;
  pms_data?: Record<string, any>;
  call_count?: number;
  total_call_duration?: number;
  call_history?: CallHistoryItem[];
  is_manual_status?: boolean;
}

export interface ContactUpdate {
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  tag?: string;
  pms_data?: Record<string, any>;
  callback_date?: string;
  purchased_package?: string;
  call_count?: number;
  total_call_duration?: number;
  call_history?: CallHistoryItem[];
  is_manual_status?: boolean;
  last_sync_at?: string;
}

export interface ContactFilter {
  tag?: string[];
  source?: string[];
  search?: string;
  created_after?: string;
  created_before?: string;
}

export interface ContactStats {
  total_contacts: number;
  by_tag: Record<string, number>;
  by_source: Record<string, number>;
  conversion_rate: number;
}

/**
 * Contacts API service.
 */
export const contactsApi = {
  /**
   * Get all contacts with pagination and filters.
   */
  async getContacts(
    page: number = 1,
    pageSize: number = 50,
    filters?: ContactFilter
  ): Promise<PaginatedResponse<Contact>> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    
    if (filters?.tag?.length) {
      filters.tag.forEach(tag => params.append('tag', tag));
    }
    
    if (filters?.source?.length) {
      filters.source.forEach(source => params.append('source', source));
    }
    
    if (filters?.search) {
      params.append('search', filters.search);
    }
    
    const response = await apiClientV2.get<PaginatedResponse<Contact>>(
      `/contacts?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Get single contact by ID.
   */
  async getContact(contactId: string): Promise<Contact> {
    const response = await apiClientV2.get<Contact>(`/contacts/${contactId}`);
    return response.data;
  },

  /**
   * Create new contact.
   */
  async createContact(data: ContactCreate): Promise<Contact> {
    const response = await apiClientV2.post<Contact>('/contacts', data);
    return response.data;
  },

  /**
   * Update existing contact.
   */
  async updateContact(contactId: string, data: ContactUpdate): Promise<Contact> {
    const response = await apiClientV2.patch<Contact>(`/contacts/${contactId}`, data);
    return response.data;
  },

  /**
   * Delete contact.
   */
  async deleteContact(contactId: string): Promise<void> {
    await apiClientV2.delete(`/contacts/${contactId}`);
  },

  /**
   * Bulk upload contacts from CSV.
   */
  async bulkUpload(file: File): Promise<ApiResponse<{ created: number; skipped: number }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await apiClientV2.post<ApiResponse<any>>(
      '/contacts/bulk-upload',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  },

  /**
   * Get contact statistics.
   */
  async getStats(): Promise<ContactStats> {
    const response = await apiClientV2.get<ContactStats>('/contacts/stats');
    return response.data;
  },

  /**
   * Export contacts to CSV.
   */
  async exportContacts(filters?: ContactFilter): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters?.tag?.length) {
      filters.tag.forEach(tag => params.append('tag', tag));
    }
    
    const response = await apiClientV2.get(`/contacts/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

