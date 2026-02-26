import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, RefreshCw, PlusCircle, Loader2, Play, Square, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { ScheduleCampaignDialog } from "@/components/campaigns/ScheduleCampaignDialog";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface BackendCampaign {
  _id: string;
  name: string;
  agentId: string;
  batchId?: string;
  targetStatus: string;
  status: "draft" | "scheduled" | "running" | "completed" | "failed" | "stopped";
  leadCount: number;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  running: { label: "Running", className: "bg-orange-100 text-orange-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  stopped: { label: "Stopped", className: "bg-red-50 text-red-600 border border-red-200" },
};

function formatDate(dateString: string) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function fetchCampaigns(page: number): Promise<{ campaigns: BackendCampaign[]; pagination: PaginationData }> {
  const res = await fetch(`/api/campaigns?page=${page}&limit=${PAGE_SIZE}`, { credentials: "include" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to fetch" }));
    throw new Error(err.error || "Failed to fetch campaigns");
  }
  const data = await res.json();
  return {
    campaigns: data.campaigns || [],
    pagination: data.pagination || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
  };
}

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [scheduleDialogData, setScheduleDialogData] = useState<{ id: string; name: string } | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["backend-campaigns", page],
    queryFn: () => fetchCampaigns(page),
    staleTime: 30_000,
  });

  const campaigns = data?.campaigns || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  const handleRefresh = () => {
    refetch();
    toast.success("Data refreshed");
  };

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["backend-campaigns"] });
  };

  const handleSchedule = async (isoDateTime: string) => {
    if (!scheduleDialogData) return;
    try {
      const res = await fetch(`/api/campaigns/${scheduleDialogData.id}/schedule`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: isoDateTime }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to schedule" }));
        throw new Error(err.error || "Failed to schedule");
      }
      toast.success("Campaign scheduled successfully");
      setScheduleDialogData(null);
      refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStopCampaign = async (campaignId: string, campaignName: string) => {
    if (!window.confirm(`Are you sure you want to stop "${campaignName}"?\n\nThis action is permanent — you cannot resume a stopped campaign. You will need to create a new campaign to re-run.`)) {
      return;
    }

    setStoppingId(campaignId);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/stop`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to stop" }));
        // Refetch to pick up any auto-synced status from the backend
        refetch();
        toast.error(err.error || "Campaign may have already completed. Status has been refreshed.");
        return;
      }
      toast.success("Campaign stopped successfully");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Network error while stopping campaign");
      refetch();
    } finally {
      setStoppingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Campaigns</h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Outbound call campaigns via Bolna batches
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="gap-2 h-9 sm:h-10 text-xs sm:text-sm"
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 gap-2 h-9 sm:h-10 text-xs sm:text-sm"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-amber-800">
          <span className="font-semibold">Note:</span> Stopping a campaign is permanent. Once stopped, the batch cannot be resumed. You will need to create a new campaign to re-run calls.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm">{(error as Error).message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Campaign List */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">
            All Campaigns ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 text-sm mb-4">
                Create a campaign to start making outbound calls from your CRM leads.
              </p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaigns.map((campaign) => {
                    const sc = statusConfig[campaign.status] || statusConfig.draft;
                    const isStopping = stoppingId === campaign._id;
                    const canStop = campaign.status === "scheduled" || campaign.status === "running";

                    return (
                      <tr key={campaign._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                          {campaign.batchId && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Batch: {campaign.batchId.slice(0, 8)}...
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className="bg-orange-50 text-orange-700 text-xs capitalize">
                            {campaign.targetStatus.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-700">{campaign.leadCount}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={cn("text-xs", sc.className)}>{sc.label}</Badge>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">
                            {formatDate(campaign.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {/* Activate button for drafts */}
                            {campaign.status === "draft" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 gap-1.5 h-8 px-3 font-medium transition-all"
                                onClick={() => setScheduleDialogData({ id: campaign._id, name: campaign.name })}
                              >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Activate
                              </Button>
                            )}

                            {/* Stop button for scheduled/running */}
                            {canStop && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 gap-1.5 h-8 px-3 font-medium transition-all"
                                onClick={() => handleStopCampaign(campaign._id, campaign.name)}
                                disabled={isStopping}
                              >
                                {isStopping ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Square className="h-3.5 w-3.5 fill-current" />
                                )}
                                {isStopping ? "Stopping..." : "Stop"}
                              </Button>
                            )}

                            {/* Schedule info for non-draft campaigns */}
                            {campaign.status !== "draft" && campaign.scheduledAt && !canStop && (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-blue-600">
                                  {new Date(campaign.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  at {new Date(campaign.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}

                            {/* Schedule info for stoppable campaigns */}
                            {canStop && campaign.scheduledAt && (
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-medium text-blue-600">
                                  {new Date(campaign.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  at {new Date(campaign.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-900 px-3 py-1 bg-gray-100 rounded-md">
              {page}
            </span>
            <span className="text-xs sm:text-sm text-gray-400">
              of {pagination.totalPages}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="text-gray-600 hover:bg-gray-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreated={handleCreated}
      />

      {/* Schedule Campaign Dialog */}
      <ScheduleCampaignDialog
        open={!!scheduleDialogData}
        onOpenChange={(open) => !open && setScheduleDialogData(null)}
        campaignName={scheduleDialogData?.name || ""}
        onSchedule={handleSchedule}
      />
    </div>
  );
}
