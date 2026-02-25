import axios from "axios";

export type CustomerStatus = "fresh" | "interested" | "not_interested" | "booked" | "NA" | "queries";

export interface IPastConversation {
  date: string;
  summary: string;
  notes: string;
}

export interface CrmCustomer {
  _id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  status: CustomerStatus;
  pastConversations: IPastConversation[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CrmListResponse {
  customers: CrmCustomer[];
  total: number;
  page: number;
  limit: number;
}

export interface CrmStats {
  fresh: number;
  interested: number;
  not_interested: number;
  booked: number;
  NA: number;
  queries: number;
  total: number;
}

export interface CrmListParams {
  status?: CustomerStatus | "all";
  search?: string;
  page?: number;
  limit?: number;
}

const BASE = "/api/crm";

export const crmApi = {
  getStats: async (): Promise<CrmStats> => {
    const res = await axios.get(`${BASE}/stats`);
    return res.data;
  },

  getAll: async (params: CrmListParams): Promise<CrmListResponse> => {
    const res = await axios.get(BASE, { params });
    return res.data;
  },

  create: async (data: { name: string; phoneNumber: string; email?: string; status?: CustomerStatus }): Promise<{ customer: CrmCustomer }> => {
    const res = await axios.post(BASE, data);
    return res.data;
  },

  update: async (
    id: string,
    data: { name?: string; phoneNumber?: string; email?: string; status?: CustomerStatus }
  ): Promise<{ customer: CrmCustomer }> => {
    const res = await axios.put(`${BASE}/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<{ success: boolean }> => {
    const res = await axios.delete(`${BASE}/${id}`);
    return res.data;
  },

  bulkUpload: async (file: File): Promise<{
    message: string;
    insertedCount: number;
    skippedCount: number;
    errors: any[];
  }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await axios.post(`${BASE}/bulk`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  syncBolna: async (): Promise<{ success: boolean; data: { processed: number; created: number; updated: number } }> => {
    const res = await axios.post(`${BASE}/sync-bolna`);
    return res.data;
  },
};
