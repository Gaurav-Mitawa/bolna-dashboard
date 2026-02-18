import { authFetchJson, authFetch } from "@/lib/api";
import type { Contact, LeadTag, ContactSource } from "@/types";

/**
 * Response from initiating a call to a contact
 */
export interface CallInitiateResponse {
  status: string;
  call_id: string;
  message: string;
  vapi_call_id?: string;
  agent_name?: string;
}

/**
 * Filters for querying contacts
 */
export interface ContactFilters {
  tag?: LeadTag;
  source?: ContactSource;
  search?: string;
  skip?: number;
  limit?: number;
}

/**
 * Get contacts from the backend API with optional filters
 *
 * @param filters - Optional filters for tag, source, search, pagination
 * @returns Promise resolving to array of contacts
 * @throws Error if the API request fails
 */
export async function getContacts(
  filters?: ContactFilters
): Promise<Contact[]> {
  const params = new URLSearchParams();

  if (filters?.tag) {
    params.append("tag", filters.tag);
  }
  if (filters?.source) {
    params.append("source", filters.source);
  }
  if (filters?.search) {
    params.append("search", filters.search);
  }
  if (filters?.skip !== undefined) {
    params.append("skip", filters.skip.toString());
  }
  if (filters?.limit !== undefined) {
    params.append("limit", filters.limit.toString());
  }

  const queryString = params.toString();
  const url = `/api/contacts${queryString ? `?${queryString}` : ""}`;

  return authFetchJson<Contact[]>(url);
}

/**
 * Get a single contact by ID with intelligence data
 * 
 * Returns ContactDetailResponse which includes:
 * - Basic contact fields
 * - last_call_intelligence: All VAPI structured outputs from last call
 *
 * @param contactId - The ID of the contact to fetch
 * @returns Contact object with last_call_intelligence field
 * @throws Error if the contact is not found or request fails
 */
export async function getContact(contactId: string): Promise<Contact> {
  // Backend now returns ContactDetailResponse with last_call_intelligence
  return authFetchJson<Contact>(`/api/contacts/${contactId}`);
}

/**
 * Create a new contact
 *
 * @param data - Contact creation data
 * @returns Created contact
 * @throws Error if creation fails
 */
export async function createContact(
  data: {
    name: string;
    email: string;
    phone: string;
    tag: string;
    source: string;
    company_name?: string;
  }
): Promise<Contact> {
  return authFetchJson<Contact>("/api/contacts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing contact
 *
 * @param contactId - The ID of the contact to update
 * @param data - Partial contact data to update
 * @returns Updated contact
 * @throws Error if update fails
 */
export async function updateContact(
  contactId: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    tag: string;
    source: string;
    company_name: string;
  }>
): Promise<Contact> {
  return authFetchJson<Contact>(`/api/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * Delete a contact
 *
 * @param contactId - The ID of the contact to delete
 * @throws Error if deletion fails
 */
export async function deleteContact(contactId: string): Promise<void> {
  const response = await authFetch(`/api/contacts/${contactId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || "Failed to delete contact");
  }
}

/**
 * Update a contact's tag
 *
 * @param contactId - The ID of the contact
 * @param tag - New tag value
 * @returns Updated contact
 * @throws Error if update fails
 */
export async function updateContactTag(
  contactId: string,
  tag: string
): Promise<Contact> {
  return updateContact(contactId, { tag });
}

/**
 * Initiate a call to a contact using VAPI
 *
 * @param contactId - The ID of the contact to call
 * @returns Call initiation response with call ID and status
 * @throws Error if the call fails to initiate
 */
export async function initiateCall(
  contactId: string
): Promise<CallInitiateResponse> {
  return authFetchJson<CallInitiateResponse>(
    `/api/contacts/${contactId}/call`,
    {
      method: "POST",
    }
  );
}

/**
 * Get detailed contact information with history
 * 
 * @param contactId - The ID of the contact
 * @returns Contact details including call history and booking data
 * @throws Error if the request fails
 */
export async function getContactDetails(contactId: string) {
  return authFetchJson(`/api/contacts/${contactId}/details`);
}

/**
 * Latest structured call data from VAPI
 * 
 * NOTE: structured_data is now a flexible object that can contain any fields
 * extracted from VAPI's structured outputs. Common fields include:
 * - leadStatus, productInterestLevel, bookingAction, customerSentiment
 * - bookingConfirmed, appointmentDate, appointmentTime, serviceName
 * - specialRequests, followUpNeeded, and any custom fields defined in VAPI assistant
 */
export interface LatestStructuredCallResponse {
  has_structured_data: boolean;
  id?: string;
  date?: string;
  created_at?: string;
  structured_data?: {
    // Common fields (but not exhaustive - can have any keys)
    leadStatus?: string;
    productInterestLevel?: string;
    bookingAction?: string;
    followUpNeeded?: boolean;
    customerSentiment?: string;
    bookingConfirmed?: boolean;
    appointmentDate?: string;
    appointmentTime?: string;
    serviceName?: string;
    specialRequests?: string;
    // Allow any additional fields from VAPI structured outputs
    [key: string]: unknown;
  };
  success_evaluation?: string;
  duration_seconds?: number;
  duration?: string;
  sentiment_score?: number;
  outcome?: string;
  intent?: string;
  summary?: string;
  contact_lead_score?: number;
  contact_conversion_probability?: number;
  contact_tag?: string;
  message?: string;
}

/**
 * Get the latest call with structured data for a contact
 * 
 * Used in Contact Detail modal to display lead intelligence:
 * - Lead score and conversion probability
 * - Lead status (hot/warm/cold)
 * - Product interest level
 * - Booking information
 * 
 * @param contactId - The ID of the contact
 * @returns Latest structured call data or message if none found
 * @throws Error if the request fails
 */
export async function getLatestStructuredCall(
  contactId: string
): Promise<LatestStructuredCallResponse> {
  return authFetchJson<LatestStructuredCallResponse>(
    `/api/contacts/${contactId}/latest-structured-call`
  );
}

