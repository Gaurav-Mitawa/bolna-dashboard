/**
 * Dashboard Page
 * Shows subscription status, CRM pipeline overview, and call analytics
 * Fully responsive across all device sizes
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { agentApi, executionsApi, BolnaExecution } from "@/lib/bolnaApi";
import { callProcessorApi } from "@/api/callProcessorApi";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  LayoutGrid,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  DateFilter,
  DateRangeFilter,
  getDefaultDateRange,
} from "@/components/dashboard/DateFilter";
import { DonutCard } from "@/components/dashboard/shared/DonutCard";
import { cn } from "@/lib/utils";

const COLORS = {
  blue: "#3B82F6",
  red: "#EF4444",
  orange: "#F97316",
  purple: "#8B5CF6",
  green: "#10B981",
  yellow: "#EAB308",
  gray: "#9CA3AF",
};

type DashboardMode = "outbound" | "inbound";

interface DashboardSummary {
  leads: {
    fresh: number;
    interested: number;
    not_interested: number;
    booked: number;
    NA: number;
    total: number;
  };
  campaigns: { total: number };
  subscription: {
    status: string;
    expiresAt: string | null;
    trialExpiresAt: string | null;
    daysLeft: number;
    isTrial: boolean;
  };
}

function extractIntent(execution: BolnaExecution, _mode: DashboardMode, llmIntent?: string): string {
  if (llmIntent) {
    switch (llmIntent) {
      case "booked": return "Booked";
      case "not_interested": return "Not Interested";
      default: return "Queries";
    }
  }
  const data = execution.extracted_data || {};
  const transcript = execution.transcript?.toLowerCase() || "";
  if (data.intent === "not_interested" || transcript.includes("not interested"))
    return "Not Interested";
  if (data.intent === "booked" || transcript.includes("book"))
    return "Booked";
  return "Queries";
}

function extractCallStatus(execution: BolnaExecution, mode: DashboardMode): string {
  if (mode === "outbound") {
    const status = execution.status;
    const data = execution.extracted_data || {};
    const transcript = execution.transcript?.toLowerCase() || "";
    const isScheduled =
      data.intent === "booked" ||
      transcript.includes("book") ||
      transcript.includes("schedule");
    if (status === "completed") return isScheduled ? "Scheduled" : "Answered";
    if (status === "busy") return "Busy";
    return "No-answer";
  }
  const hour = new Date(execution.created_at).getHours();
  return hour >= 9 && hour < 17 ? "Office Hours" : "Non-Office Hours";
}




export default function Dashboard() {
  const { user } = useAuth();
  const [mode, setMode] = useState<DashboardMode>("outbound");
  const [dateRange, setDateRange] = useState<DateRangeFilter>(getDefaultDateRange());

  // Fetch aggregated dashboard summary from backend
  const { data: summary } = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  // Fetch Bolna executions for donut charts
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["agents"],
    queryFn: () => agentApi.getAll(),
  });

  const { data: processedCalls = [] } = useQuery({
    queryKey: ["processedCalls"],
    queryFn: () => callProcessorApi.getProcessedCalls(),
  });

  const { data: executions = [], isLoading: executionsLoading } = useQuery({
    queryKey: ["executions", agents?.map((a) => a.id), dateRange],
    queryFn: async () => {
      if (!agents || agents.length === 0) return [];

      const allExecutions = await Promise.all(
        agents.slice(0, 10).map((agent) =>
          executionsApi.getByAgent(agent.id, {
            page_size: 100,
            from: dateRange.start.toISOString(),
            to: dateRange.end.toISOString(),
          })
        )
      );
      return allExecutions.flatMap((r) => r.data || []);
    },
    enabled: !!agents && agents.length > 0,
  });

  const llmIntentMap = useMemo(() => {
    const map = new Map<string, string>();
    processedCalls.forEach((c: any) => {
      if (c.llm_analysis?.intent) map.set(c.call_id, c.llm_analysis.intent);
    });
    return map;
  }, [processedCalls]);

  const isLoading = agentsLoading || executionsLoading;

  const filteredExecutions = useMemo(() => {
    return executions.filter((e: any) => {
      // Default missing call_type to outbound as it's the most common
      const callType = e.telephony_data?.call_type || "outbound";
      const modeMatch =
        mode === "outbound" ? callType === "outbound" : callType === "inbound";
      if (!modeMatch) return false;

      const executionDate = new Date(e.created_at);
      // Ensure we have a valid date comparison
      return !isNaN(executionDate.getTime()) &&
        executionDate >= dateRange.start &&
        executionDate <= dateRange.end;
    });
  }, [executions, mode, dateRange]);


  const intentData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredExecutions.forEach((e) => {
      const llmIntent = llmIntentMap.get(e.id);
      const intent = extractIntent(e, mode, llmIntent);
      counts[intent] = (counts[intent] || 0) + 1;
    });
    return [
      { name: "Queries", value: counts["Queries"] || 0, color: COLORS.green },
      { name: "Booked", value: counts["Booked"] || 0, color: COLORS.blue },
      { name: "Not Interested", value: counts["Not Interested"] || 0, color: COLORS.red },
    ];
  }, [filteredExecutions, mode, llmIntentMap]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredExecutions.forEach((e) => {
      const status = extractCallStatus(e, mode);
      counts[status] = (counts[status] || 0) + 1;
    });
    if (mode === "outbound") {
      return [
        { name: "Answered", value: counts["Answered"] || 0, color: COLORS.blue },
        { name: "Scheduled", value: counts["Scheduled"] || 0, color: COLORS.green },
        { name: "Busy", value: counts["Busy"] || 0, color: COLORS.orange },
        { name: "No-answer", value: counts["No-answer"] || 0, color: COLORS.red },
      ];
    }
    return [
      { name: "Office Hours", value: counts["Office Hours"] || 0, color: COLORS.green },
      { name: "Non-Office Hours", value: counts["Non-Office Hours"] || 0, color: COLORS.orange },
    ];
  }, [filteredExecutions, mode]);

  // Subscription/Trial banner
  const sub = summary?.subscription;
  const showSubBanner = sub && (!sub.isTrial && (sub.status !== "active" || sub.daysLeft <= 7)) || (sub?.isTrial);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Subscription/Trial Banner */}
      {showSubBanner && (
        <div
          className={cn(
            "rounded-xl p-4 border flex items-center gap-3",
            sub.isTrial
              ? "bg-blue-50 border-blue-200"
              : sub.status === "active" && sub.daysLeft <= 7
                ? "bg-yellow-50 border-yellow-200"
                : "bg-red-50 border-red-200"
          )}
        >
          {sub.isTrial ? (
            <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
          ) : sub.status === "active" ? (
            <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            {sub.isTrial ? (
              <p className="text-sm font-medium text-blue-800">
                You are on a <strong>7-day free trial</strong>. You have <strong>{sub.daysLeft} days</strong> remaining.
              </p>
            ) : sub.status === "active" ? (
              <p className="text-sm font-medium text-yellow-800">
                Subscription expires in <strong>{sub.daysLeft} days</strong>
              </p>
            ) : (
              <p className="text-sm font-medium text-red-800">
                Your subscription has{" "}
                <strong>{sub.status === "expired" ? "expired" : "not been activated"}</strong>.
                Subscribe to continue accessing the platform.
              </p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "flex-shrink-0",
              sub.isTrial ? "border-blue-200 hover:bg-blue-100" : ""
            )}
            onClick={() => (window.location.href = "/subscribe")}
          >
            {sub.isTrial ? "Upgrade Now" : sub.status === "active" ? "Renew" : "Subscribe"}
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {mode === "outbound" ? "Outbound" : "Inbound"} Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              {user?.name ? `Welcome back, ${user.name.split(" ")[0]}` : "Real-time analytics"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DateFilter value={dateRange} onChange={setDateRange} />
          <Select value={mode} onValueChange={(v: string) => setMode(v as DashboardMode)}>
            <SelectTrigger className="w-[120px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="default"
            className="bg-orange-500 hover:bg-orange-600 h-9 sm:h-10 text-xs sm:text-sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </Button>
        </div>
      </div>




      {/* Donut Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <DonutCard
          title="Call Intent"
          subheader={
            mode === "outbound" ? "AI-powered lead intent analysis" : "AI-powered inquiry analysis"
          }
          data={intentData}
        />
        <DonutCard
          title="Call Status"
          subheader={
            mode === "outbound" ? "Call outcome breakdown" : "Call timing breakdown"
          }
          data={statusData}
        />
      </div>
    </div>
  );
}
