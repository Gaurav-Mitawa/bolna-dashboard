/**
 * Voice Agent Management Page
 * Main page for managing AI voice agents
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic } from "lucide-react";
import { AgentStats } from "@/components/agents/AgentStats";
import { AgentList } from "@/components/agents/AgentList";
import {
  getAllAgents,
  getAgentsStats,
  updateAgentStatus,
} from "@/api/bolnaAgents";
import { toast } from "sonner";

export default function VoiceAgentPage() {
  const queryClient = useQueryClient();

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



  const handleToggleStatus = (agentId: string, isActive: boolean) => {
    updateStatusMutation.mutate({ agentId, isActive });
  };

  const handleOpenSettings = (agentId: string) => {
    toast.info(`Opening settings for agent ${agentId}`);
    // TODO: Implement agent settings modal/page
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
    </div>
  );
}
