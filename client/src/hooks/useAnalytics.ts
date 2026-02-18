import { useQuery } from "@tanstack/react-query";
import { authFetchJson } from "@/lib/api";

export interface DashboardAnalytics {
  stats: {
    totalCalls: number;
    totalRevenue: number;
    successRate: number;
    meetingsBooked: number;
    trends: {
      totalCalls: number;
      totalRevenue: number;
      successRate: number;
      meetingsBooked: number;
    };
    // Rich analytics for donut charts
    intent?: {
      converted: number;
      notInterested: number;
      followUp: number;
    };
    callStatus?: {
      answered: number;
      noAnswer: number;
      voicemail: number;
      declined: number;
    };
    inboundCalls?: {
      bookingConfirmed: number;
      bookingCancelled: number;
      querySupport: number;
      rescheduling?: number;
    };
    callTiming?: {
      officeHour: number;
      nonOfficeHour: number;
    };
  };
  revenue: { date: string; value: number }[];
  activity: {
    id: string;
    type: "call" | "booking";
    agentName: string;
    status: "success" | "failed" | "pending";
    duration?: string;
    timestamp: string;
  }[];
}

export interface VoiceAnalytics {
  totals: {
    active_agents: number;
    total_minutes: number;
    total_cost: number;
  };
  trend: { date: string; calls: number; duration_minutes: number }[];
}

export function useDashboardAnalytics(direction?: "inbound" | "outbound" | null) {
  return useQuery<DashboardAnalytics>({
    queryKey: ["analytics", "dashboard", direction],
    queryFn: () => {
      const url = direction 
        ? `/api/analytics/dashboard?direction=${direction}`
        : "/api/analytics/dashboard";
      return authFetchJson<DashboardAnalytics>(url);
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useVoiceAnalytics() {
  return useQuery<VoiceAnalytics>({
    queryKey: ["analytics", "voice"],
    queryFn: () => authFetchJson<VoiceAnalytics>("/api/analytics/voice"),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
    retryDelay: 1000,
  });
}

