/**
 * Agent List Component
 * Table showing all voice agents with their statistics and actions
 */
import { AgentWithStats } from "@/api/bolnaAgents";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Settings, Mic, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentListProps {
  agents: AgentWithStats[];
  onToggleStatus: (agentId: string, isActive: boolean) => void;
  onOpenSettings: (agentId: string) => void;
  isLoading?: boolean;
}

export function AgentList({
  agents,
  onToggleStatus,
  onOpenSettings,
  isLoading = false,
}: AgentListProps) {


  // Get voice style based on voice name
  const getVoiceStyle = (voiceName: string): string => {
    const styles: Record<string, string> = {
      'Nila': 'Female - Professional',
      'Matthew': 'Male - Professional',
      'Asteria': 'Female - Friendly',
    };
    return styles[voiceName] || 'Female - Professional';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
          <Mic className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No voice agents yet</h3>
        <p className="text-gray-500 mb-4">Create your first voice agent to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Active Voice Agents</h3>
        <p className="text-sm text-gray-500 mt-1">Manage and monitor your AI voice agents</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Agent Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Language & Voice
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Calls Handled
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((agent, index) => (
              <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                {/* Agent Name */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center">
                      <Mic className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">ID: #{index + 1}</p>
                    </div>
                  </div>
                </td>

                {/* Language & Voice */}
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-gray-900">{agent.language}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      {getVoiceStyle(agent.voice_name)}
                    </p>
                  </div>
                </td>

                {/* Calls Handled */}
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-gray-900">
                    {agent.stats.calls_handled.toLocaleString()}
                  </p>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <Badge
                    className={cn(
                      "text-xs",
                      agent.is_active
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                    )}
                  >
                    {agent.is_active ? "active" : "paused"}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9",
                        agent.is_active
                          ? "text-yellow-600 hover:bg-yellow-50"
                          : "text-green-600 hover:bg-green-50"
                      )}
                      onClick={() => onToggleStatus(agent.id, !agent.is_active)}
                      disabled={isLoading}
                    >
                      {agent.is_active ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-gray-600 hover:bg-gray-100"
                      onClick={() => onOpenSettings(agent.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
