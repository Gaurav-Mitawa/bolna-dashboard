// =============================================================================
// SHARED TYPES - Central type definitions for the Voice Agent Analytics SaaS
// =============================================================================

// -----------------------------------------------------------------------------
// USER TYPES
// -----------------------------------------------------------------------------

/**
 * User interface matching backend response
 * Used for authentication and user state management
 */
export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  voice_provider: string | null;
  has_connected_provider?: boolean;
  connected_providers?: string[];
}

// -----------------------------------------------------------------------------
// LEAD & CONTACT TYPES
// -----------------------------------------------------------------------------

/**
 * Contact source tracking - where the lead originated from
 */
export type ContactSource = "csv" | "pms" | "webchat" | "manual";

/**
 * Complete 9-tag lead status system
 * Used across Overview dashboard and Contacts CRM
 */
export type LeadTag =
  | "fresh"
  | "fresh_na"
  | "converted"
  | "follow_up"
  | "follow_up_interested"
  | "follow_up_not_interested"
  | "follow_up_converted"
  | "not_interested"
  | "purchased";

/**
 * PMS (Property Management System) personalization data
 * Tourism/Hospitality specific guest information
 * Stored as JSON in backend, parsed on frontend
 */
export interface PMSPersonalization {
  roomType: string;
  checkIn: string;
  checkOut: string;
  specialRequests: string;
  loyaltyTier?: string;
  previousStays: number;
  guestPreferences: string[];
}

/**
 * Voice agent call record with follow-up tracking
 * Updated to align with backend schema - uses ISO date strings
 * Includes rich analytics from VAPI (transcript, recording, cost)
 */
export interface CallSummary {
  id: string;
  date: string;                // ISO string preferred for backend, formatted in UI
  agentId?: string;            // Reference to the agent who made the call
  agentType: "main" | "follow_up" | "inbound";
  outcome: string;             // Flexible outcome string (answered, no_answer, voicemail, declined)
  summary: string;             // Call summary text
  duration: string;            // Duration in "M:SS" format
  // Rich analytics fields (from VAPI)
  transcript?: string;         // Full call transcript
  recordingUrl?: string;       // URL to call recording
  cost?: number;               // Call cost in USD
  sentimentScore?: number;     // Sentiment score (0-100)
}

/**
 * Contact Intelligence data from last call (VAPI structured outputs)
 * Contains all structured outputs from VAPI webhook for display in Intelligence Tab
 */
export interface ContactIntelligence {
  structured_outputs: {
    'Lead Status'?: string;
    'Customer Sentiment'?: string;
    'Product Interest Level'?: string;
    'Appointment Booked'?: boolean;
    'Appointment Cancelled'?: boolean;
    'Appointment Rescheduled'?: boolean;
    'Follow Up Required'?: string;
    'Budget Discussed'?: string;
    'Call Summary'?: string;
    'Call Recording Quality'?: string;
    'Next Steps'?: string;
    'Booking Details'?: {
      serviceType?: string;
      appointmentDate?: string;
      appointmentTime?: string;
      confirmed?: boolean;
      customerEmail?: string;
      notes?: string;
    };
    // Allow any additional fields from VAPI structured outputs
    [key: string]: unknown;
  };
  transcript?: string;
  recording_url?: string;
  summary?: string;
  sentiment_score?: number;  // 0-100
  intent?: string;  // "converted", "follow_up", "not_interested", etc.
  date?: string;  // ISO format
  duration?: string;  // "M:SS" format
  cost?: number;  // Call cost in USD
}

/**
 * Complete contact entity with all tracking data
 * Updated with companyName field for B2B support and intelligence data
 */
export interface Contact {
  id: string;
  companyName?: string;        // NEW: B2B company name field
  company_name?: string;       // Backend uses snake_case
  name: string;
  email: string;
  phone: string;
  source: ContactSource;
  tag: LeadTag;
  pmsData?: PMSPersonalization; // Optional - may not exist for all contacts
  callSummaries: CallSummary[];
  purchasedPackage?: string | null;
  purchased_package?: string | null;  // Backend uses snake_case
  createdAt?: string;
  created_at?: string;  // Backend uses snake_case
  lastContactedAt?: string | null;
  last_call_summary?: string | null;  // Last call summary (first 200 chars)
  last_contacted_at?: string | null;  // Backend uses snake_case
  last_call_date?: string | null;  // Last call date
  no_answer_count?: number;
  // Lead intelligence from VAPI structured outputs
  lead_score?: number;  // 0-100 lead score
  conversion_probability?: number;  // 0-100 conversion probability
  // NEW: Intelligence data from last call (from backend ContactDetailResponse)
  last_call_intelligence?: ContactIntelligence | null;
}

/**
 * Call history item for contact detail modal
 */
export interface CallHistoryItem {
  id: string;
  type: 'CALL' | 'CHAT';
  duration?: string;
  agent: string;
  sentiment?: string;
  summary: string;
  timestamp: string;
  outcome?: string;
  sentiment_score?: number;
}

/**
 * Booking data for contact detail modal
 */
export interface BookingData {
  has_booking: boolean;
  package?: string;
  status?: string;
  room_type?: string;
  check_in?: string;
  check_out?: string;
  previous_stays?: number;
  loyalty_tier?: string;
  special_requests?: string;
  preferences?: string[];
}

/**
 * Complete contact details response from backend
 */
export interface ContactDetails {
  contact: Contact;
  call_history: CallHistoryItem[];
  booking_data: BookingData | null;
  stats: {
    total_calls: number;
    total_bookings: number;
  };
}

// -----------------------------------------------------------------------------
// AGENT TYPES
// -----------------------------------------------------------------------------

/**
 * Agent type classification
 * - main: Targets fresh leads (Fresh, Fresh-NA)
 * - follow_up: Targets converted leads (Converted, Follow-up)
 * - inbound: Passive agent, always on standby
 */
export type AgentType = "main" | "follow_up" | "inbound";

/**
 * Agent running status
 */
export type AgentStatus = "idle" | "running" | "paused";

/**
 * Lead source options for agent configuration
 * Main agents: Fresh, Fresh-NA only
 * Follow-up agents: Converted, Follow-up only
 */
export type LeadSourceOption = 
  | "fresh" 
  | "fresh_na" 
  | "converted" 
  | "purchased"
  | "not_interested"
  | "follow_up_interested"
  | "follow_up_converted";

/**
 * Campaign agent configuration settings
 * Used for campaign agent lead source selection and VAPI agent selection
 */
export interface CampaignAgentConfig {
  leadSource: LeadSourceOption;
  selectedVoiceAgentId?: string; // VAPI agent ID (from voice_agents table) to use for this campaign
  selectedPhoneNumberId?: string; // VAPI phone number ID to use as caller ID
}

/**
 * Live agent metrics during campaign execution
 */
export interface AgentMetrics {
  totalCalls: number;
  duration: string;
  conversionRate: number;
}

/**
 * Campaign agent instance with full state
 * Used in the Campaign Agents section
 */
export interface CampaignAgent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  config: CampaignAgentConfig;
  metrics: AgentMetrics | null;
}

/**
 * Agent report data for performance modal
 */
export interface AgentReportData {
  totalCalls: number;
  totalDuration: string;
  avgCallDuration: string;
  conversionRate: number;
  customerIntent: {
    interested: number;
    notInterested: number;
    followUp: number;
  };
  upsellMetrics: {
    spaPackages: number;
    roomUpgrades: number;
    diningReservations: number;
    tourBookings: number;
  };
  revenueGenerated: number;
}

// -----------------------------------------------------------------------------
// CHART & ANALYTICS TYPES
// -----------------------------------------------------------------------------

/**
 * View mode for dashboard - controls which charts/data are displayed
 * "inbound" now includes both Inbound calls + Webchat
 */
export type DashboardViewMode = "outbound" | "inbound";

/**
 * Time range for revenue chart filtering
 * Weekly = day-by-day (Mon-Sun), Monthly = month-by-month (Jan-Dec)
 */
export type TimeRange = "weekly" | "monthly";

/**
 * Data point for donut/pie charts
 */
export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

/**
 * Revenue data for bar chart - supports both weekly and monthly views
 */
export interface RevenueDataPoint {
  period: string;              // "Week 1", "Jan", etc.
  outbound: number;
  inbound: number;
  webchat: number;
  total: number;
}

/**
 * Weekly revenue data for bar chart (legacy - use RevenueDataPoint)
 */
export interface WeeklyRevenueData {
  week: string;
  outbound: number;
  inbound: number;
  webchat: number;
  total: number;
}

/**
 * Stats data structure for donut chart section
 * Outbound: Customer Intent + Call Status
 * Inbound: Inbound Calls + Webchat
 */
export interface DashboardStats {
  // Intent distribution (for outbound left donut)
  // Colors: Converted=GREEN, Not Interested=RED, Follow-up=YELLOW
  intent: {
    converted: number;
    notInterested: number;
    followUp: number;
  };
  // Call status for outbound (for outbound right donut)
  callStatus: {
    answered: number;
    noAnswer: number;
    voicemail: number;
    declined: number;
  };
  // Inbound Calls (for inbound left donut)
  // Tags: Booking Confirmed, Booking Cancelled, Query Support
  inboundCalls: {
    bookingConfirmed: number;
    bookingCancelled: number;
    querySupport: number;
  };
  // Webchat stats (for inbound right donut)
  webchat: {
    bookingConfirmed: number;
    querySupport: number;
    bookingEnquiries: number;
  };
}

// -----------------------------------------------------------------------------
// TAG CONFIGURATION
// -----------------------------------------------------------------------------

/**
 * Tag display configuration with label and colors
 */
export interface TagConfig {
  label: string;
  color: string;
  bgColor?: string;
}

/**
 * Complete tag configuration map
 */
export const LEAD_TAGS: Record<LeadTag, TagConfig> = {
  fresh: {
    label: "Fresh",
    color: "#10B981",
    bgColor: "#D1FAE5",
  },
  fresh_na: {
    label: "Fresh - NA",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
  },
  converted: {
    label: "Converted",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
  },
  follow_up: {
    label: "Follow-up",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
  },
  follow_up_interested: {
    label: "Follow-up - Interested",
    color: "#06B6D4",
    bgColor: "#CFFAFE",
  },
  follow_up_not_interested: {
    label: "Follow-up - NI",
    color: "#F97316",
    bgColor: "#FFEDD5",
  },
  follow_up_converted: {
    label: "Follow-up - Converted",
    color: "#22C55E",
    bgColor: "#DCFCE7",
  },
  not_interested: {
    label: "Not Interested",
    color: "#EF4444",
    bgColor: "#FEE2E2",
  },
  purchased: {
    label: "Purchased",
    color: "#14B8A6",
    bgColor: "#CCFBF1",
  },
};

/**
 * Source configuration for contacts
 */
export const SOURCE_CONFIG: Record<ContactSource, { label: string; color: string }> = {
  csv: { label: "CSV", color: "bg-slate-100 text-slate-600" },
  pms: { label: "PMS", color: "bg-blue-100 text-blue-600" },
  webchat: { label: "Webchat", color: "bg-purple-100 text-purple-600" },
  manual: { label: "Manual", color: "bg-amber-100 text-amber-600" },
};

// -----------------------------------------------------------------------------
// VAPI AGENT TYPES
// -----------------------------------------------------------------------------

/**
 * VAPI Agent interface
 * Represents an agent from the VAPI platform
 */
export interface VapiAgent {
  id: string;
  name: string;
}

