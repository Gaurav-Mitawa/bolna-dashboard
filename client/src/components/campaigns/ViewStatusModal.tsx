import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw, Phone, FileText, Calendar, Clock, Users, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BatchStatusResponse {
  batch_id: string;
  status: string;
  created_at: string;
  humanized_created_at: string;
  updated_at: string;
  scheduled_at?: string;
  from_phone_number: string;
  file_name: string;
  total_contacts: number;
  valid_contacts: number;
  execution_status: {
    [key: string]: number;
  };
}

interface ViewStatusModalProps {
  batchId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function fetchBatchStatus(batchId: string): Promise<BatchStatusResponse> {
  const res = await fetch(`/api/campaigns/batch/${batchId}/status`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
    throw new Error(err.error || "Failed to fetch batch status");
  }
  return res.json();
}

function getStatusColor(status: string): string {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === "completed") return "bg-green-50 border-green-200 text-green-700";
  if (lowerStatus === "failed") return "bg-red-50 border-red-200 text-red-700";
  if (lowerStatus === "in-progress" || lowerStatus === "ringing") 
    return "bg-blue-50 border-blue-200 text-blue-700";
  if (lowerStatus === "no-answer" || lowerStatus === "busy") 
    return "bg-yellow-50 border-yellow-200 text-yellow-700";
  if (lowerStatus === "queued") return "bg-purple-50 border-purple-200 text-purple-700";
  return "bg-gray-50 border-gray-200 text-gray-700";
}

function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as US phone number if it's 11 digits starting with 1
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // Format as US phone number if it's 10 digits
  if (cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return original if we can't format it
  return phone;
}

function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ViewStatusModal({ batchId, open, onOpenChange }: ViewStatusModalProps) {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["batch-status", batchId],
    queryFn: () => fetchBatchStatus(batchId),
    enabled: !!batchId && open,
    refetchInterval: (query) => {
      // Auto-refresh every 30s if campaign is running or scheduled
      const batchData = query.state.data;
      const isActive = batchData?.status === "running" || batchData?.status === "scheduled";
      return isActive ? 30000 : false;
    },
  });

  // Update last updated timestamp when data changes
  useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
  }, [data]);

  const handleRefresh = async () => {
    await refetch();
    setLastUpdated(new Date());
  };

  // Calculate completed calls from execution_status
  const completedCalls = data?.execution_status 
    ? Object.entries(data.execution_status).reduce((sum, [key, value]) => {
        // Count all statuses except queued as "processed"
        if (key.toLowerCase() !== "queued") {
          return sum + value;
        }
        return sum;
      }, 0)
    : 0;

  const totalContacts = data?.total_contacts || 0;
  const progressPercentage = totalContacts > 0 ? Math.round((completedCalls / totalContacts) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-500" />
            Campaign Status
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm mb-3">{(error as Error).message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefetching}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
              Retry
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Batch Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Batch Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Batch ID:</span>
                      <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono">
                        {data.batch_id}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 w-24">Status:</span>
                      <Badge className={cn("text-xs capitalize", getStatusColor(data.status))}>
                        {data.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 w-24">Created:</span>
                      <span className="text-xs text-gray-700">{data.humanized_created_at}</span>
                    </div>
                    {data.scheduled_at && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-xs font-medium text-gray-500 w-24">Scheduled:</span>
                        <span className="text-xs text-gray-700">{formatDateTime(data.scheduled_at)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 w-24">Sender:</span>
                      <span className="text-xs text-gray-700">{formatPhoneNumber(data.from_phone_number)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs font-medium text-gray-500 w-24">File:</span>
                      <span className="text-xs text-gray-700 truncate" title={data.file_name}>
                        {data.file_name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Statistics */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contact Statistics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-700">{data.total_contacts}</div>
                  <div className="text-xs text-blue-600 mt-1">Total Contacts</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-700">{data.valid_contacts}</div>
                  <div className="text-xs text-green-600 mt-1">Valid Contacts</div>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Call Progress
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">Processed Calls</span>
                  <span className="text-gray-500">
                    {completedCalls} / {totalContacts} ({progressPercentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-orange-500 h-3 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Call Status Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Call Status Breakdown
              </h3>
              {data.execution_status && Object.keys(data.execution_status).length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(data.execution_status)
                    .sort(([, a], [, b]) => b - a) // Sort by count descending
                    .map(([status, count]) => (
                      <div
                        key={status}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-lg border transition-all hover:shadow-md",
                          getStatusColor(status)
                        )}
                      >
                        <div className="text-2xl font-bold">{count}</div>
                        <div className="text-xs font-medium mt-1 capitalize text-center">
                          {status.replace(/-/g, ' ').replace(/_/g, ' ')}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No execution data available yet
                </div>
              )}
            </div>

            {/* Footer with Last Updated and Refresh */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3.5 w-3.5" />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                {(data.status === "running" || data.status === "scheduled") && (
                  <Badge variant="outline" className="text-[10px] ml-2">
                    Auto-refreshing
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefetching}
                className="gap-2 h-8 text-xs"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
