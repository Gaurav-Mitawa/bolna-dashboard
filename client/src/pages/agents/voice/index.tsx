/**
 * Voice Agent Management Page
 * Main page for managing AI voice agents
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mic, Plus, Download } from "lucide-react";
import { AgentStats } from "@/components/agents/AgentStats";
import { AgentList } from "@/components/agents/AgentList";
import { CreateAgentModal } from "@/components/agents/CreateAgentModal";
import {
  getAllAgents,
  getAgentsStats,
  createAgent,
  updateAgentStatus,
  CreateAgentData,
} from "@/api/bolnaAgents";
import { toast } from "sonner";

export default function VoiceAgentPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch all agents
  const {
    data: agents = [],
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ["voice-agents"],
    queryFn: getAllAgents,
  });

  // Fetch aggregated stats
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["agents-stats"],
    queryFn: getAgentsStats,
  });

  // Create agent mutation
  const createMutation = useMutation({
    mutationFn: createAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents-stats"] });
      toast.success("Voice agent created successfully");
      setIsCreateModalOpen(false);
    },
    onError: (error) => {
      console.error("Error creating agent:", error);
      toast.error("Failed to create voice agent");
    },
  });

  // Update agent status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ agentId, isActive }: { agentId: string; isActive: boolean }) =>
      updateAgentStatus(agentId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["voice-agents"] });
      toast.success("Agent status updated");
    },
    onError: (error) => {
      console.error("Error updating agent status:", error);
      toast.error("Failed to update agent status");
    },
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetchAgents();
      refetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [refetchAgents, refetchStats]);

  const handleCreateAgent = async (data: CreateAgentData) => {
    await createMutation.mutateAsync(data);
  };

  const handleToggleStatus = (agentId: string, isActive: boolean) => {
    updateStatusMutation.mutate({ agentId, isActive });
  };

  const handleOpenSettings = (agentId: string) => {
    toast.info(`Opening settings for agent ${agentId}`);
    // TODO: Implement agent settings modal/page
  };

  const handleExportReport = () => {
    toast.info("Exporting agent report...");
    // TODO: Implement CSV/JSON export
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Mic className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voice Agent Management</h1>
            <p className="text-gray-500">AI-powered voice agents for customer interactions</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Voice Agent
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <AgentStats 
        stats={stats || null} 
        isLoading={isLoadingStats} 
      />

      {/* Agent List Section */}
      <AgentList
        agents={agents}
        onToggleStatus={handleToggleStatus}
        onOpenSettings={handleOpenSettings}
        isLoading={isLoadingAgents || updateStatusMutation.isPending}
      />

      {/* Create Agent Modal */}
      <CreateAgentModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreate={handleCreateAgent}
      />
    </div>
  );
}
