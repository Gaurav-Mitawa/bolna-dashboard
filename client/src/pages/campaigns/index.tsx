import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, RefreshCw } from "lucide-react";
import { CampaignList } from "@/components/campaigns/CampaignList";
import { CreateCampaignModal } from "@/components/campaigns/CreateCampaignModal";
import { ScheduleCampaignDialog } from "@/components/campaigns/ScheduleCampaignDialog";
import {
  getAllCampaigns,
  createCampaign,
  stopCampaign,
  deleteCampaign,
  resumeCampaign,
  CreateCampaignData,
  CallType,
} from "@/api/bolnaCampaigns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CampaignsPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [callType, setCallType] = useState<CallType>("outbound");
  const [dateRange, setDateRange] = useState<string>("30");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: string; name: string } | null>(null);

  // Fetch campaigns
  const {
    data: campaigns = [],
    isLoading: isLoadingCampaigns,
    refetch: refetchCampaigns,
  } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getAllCampaigns,
  });

  // Create campaign mutation
  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign created successfully");
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    },
  });

  // Stop campaign mutation
  const stopMutation = useMutation({
    mutationFn: stopCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign stopped");
    },
    onError: (error) => {
      console.error("Error stopping campaign:", error);
      toast.error("Failed to stop campaign");
    },
  });

  // Resume campaign mutation
  const resumeMutation = useMutation({
    mutationFn: ({ batchId, scheduledAt }: { batchId: string; scheduledAt?: string }) =>
      resumeCampaign(batchId, scheduledAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign resumed");
    },
    onError: (error) => {
      console.error("Error resuming campaign:", error);
      toast.error("Failed to resume campaign");
    },
  });

  // Delete campaign mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campaign deleted");
    },
    onError: (error) => {
      console.error("Error deleting campaign:", error);
      const message = error instanceof Error && error.message.includes("running")
        ? "Cannot delete a running campaign. Please stop it first."
        : "Failed to delete campaign";
      toast.error(message);
    },
  });

  const handleCreateCampaign = async (data: CreateCampaignData) => {
    await createMutation.mutateAsync(data);
  };

  const handleTogglePlay = (campaignId: string, isPlaying: boolean) => {
    if (isPlaying) {
      // Find the campaign to get its name
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        setSelectedCampaign({ id: campaignId, name: campaign.agentName });
        setScheduleDialogOpen(true);
      }
    } else {
      stopMutation.mutate(campaignId);
    }
  };

  const handleSchedule = (scheduledAt: string) => {
    if (selectedCampaign) {
      resumeMutation.mutate(
        { batchId: selectedCampaign.id, scheduledAt },
        {
          onSuccess: () => {
            setScheduleDialogOpen(false);
            setSelectedCampaign(null);
          },
        }
      );
    }
  };

  const handleViewDetails = (_campaignId: string) => {
    toast.info("Viewing campaign details");
    // TODO: Open details modal or navigate to details page
  };

  const handleDelete = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);

    // Block deletion if the campaign is active (running, queued, executing, etc.)
    const blockedStatuses = ["queued", "executing", "running", "executed"];
    if (campaign && (campaign.isActive || blockedStatuses.includes(campaign.status))) {
      toast.error("Cannot delete a running campaign. Please stop it first.");
      return;
    }

    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteMutation.mutate(campaignId);
    }
  };

  const handleStatusChange = (_campaignId: string, statusTags: string[]) => {
    toast.info(`Status filter updated: ${statusTags.join(", ")}`);
    // TODO: Update campaign metadata with status tags
  };

  const handleRefresh = () => {
    refetchCampaigns();
    toast.success("Data refreshed");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
            <Megaphone className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Outbound Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500">Real-time analytics and campaign management</p>
          </div>
        </div>
      </div>

      {/* Filters Section - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">Filters:</span>
          <Select value={callType} onValueChange={(value: string) => setCallType(value as CallType)}>
            <SelectTrigger className="w-[120px] sm:w-32 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="outbound">Outbound</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] sm:w-40 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2 h-9 sm:h-10 text-xs sm:text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Campaign List Section */}
      <Card className="p-4 sm:p-6">
        <CampaignList
          campaigns={campaigns}
          onAddCampaign={() => setIsCreateModalOpen(true)}
          onStatusChange={handleStatusChange}
          onTogglePlay={handleTogglePlay}
          onViewDetails={handleViewDetails}
          onDelete={handleDelete}
          isLoading={
            isLoadingCampaigns ||
            createMutation.isPending ||
            stopMutation.isPending ||
            resumeMutation.isPending ||
            deleteMutation.isPending
          }
        />
      </Card>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreate={handleCreateCampaign}
      />

      {/* Schedule Campaign Dialog */}
      <ScheduleCampaignDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        onSchedule={handleSchedule}
        campaignName={selectedCampaign?.name || ""}
        isLoading={resumeMutation.isPending}
      />
    </div>
  );
}
