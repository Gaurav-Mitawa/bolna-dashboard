/**
 * Analytics API Client
 * Handles all analytics-related API calls
 */

import { authFetchJson } from "@/lib/api";

/**
 * Voice Analytics Response
 */
export interface VoiceAnalyticsResponse {
  total_calls: number;
  active_agents: string; // "5/10" format
  success_rate: number; // 0-100 percentage
  total_minutes: number;
  total_cost: number;
  call_volume_today: TrendDataPoint[];
  call_volume_weekly: TrendDataPoint[];
  performance_metrics: PerformanceMetric[];
  outcome_distribution: NamedValue[];
  provider_distribution: NamedValue[];
  agent_performance: AgentPerformance[];
}

/**
 * Trend Data Point
 */
export interface TrendDataPoint {
  timestamp: string; // ISO date string
  label: string; // Formatted label (e.g., "09:00", "Jan 15")
  value: number;
}

/**
 * Performance Metric
 */
export interface PerformanceMetric {
  label: string; // Backend uses "label" not "name"
  value: number; // 0-100 percentage
  unit?: string; // "%", "min", "sec", etc.
  trend?: number; // Percentage change from previous period
}

/**
 * Named Value (for distribution charts)
 */
export interface NamedValue {
  name: string;
  value: number;
}

/**
 * Agent Performance (matches backend response)
 */
export interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  total_calls: number;
  total_minutes: number;
  avg_sentiment: number;
  total_cost: number;
}

/**
 * Get voice analytics for Voice Agent Management dashboard
 *
 * @returns Promise resolving to voice analytics response
 */
export async function getVoiceAnalytics(): Promise<VoiceAnalyticsResponse> {
  return authFetchJson<VoiceAnalyticsResponse>("/api/analytics/voice");
}

