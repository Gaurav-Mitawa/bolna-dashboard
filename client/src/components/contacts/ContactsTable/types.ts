/**
 * Type definitions for Contacts components.
 */

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  tag: string;
  source: string;
  last_contacted_at?: string;
  last_call_date?: string;
  callback_date?: string;
  no_answer_count: number;
  lead_score?: number;
  conversion_probability?: number;
  created_at: string;
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

