/**
 * Call History Page
 * Shows all call executions from Bolna Voice AI
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentApi, executionsApi, BolnaExecution } from "@/lib/bolnaApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  IndianRupee,
  Play,
  FileText,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function CallHistoryPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [callTypeFilter, setCallTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedExecution, setSelectedExecution] = useState<BolnaExecution | null>(null);
  const pageSize = 20;

  // Fetch all agents for dropdown
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentApi.getAll(),
  });

  // Fetch executions
  const {
    data: executionsData,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['executions', selectedAgentId, statusFilter, callTypeFilter, page],
    queryFn: async () => {
      if (selectedAgentId === 'all' || !selectedAgentId) {
        // If we have agents, fetch from first agent
        if (agents && agents.length > 0) {
          const allExecutions = await Promise.all(
            agents.slice(0, 5).map(agent =>
              executionsApi.getByAgent(agent.id, {
                page_number: page,
                page_size: pageSize,
                status: statusFilter !== 'all' ? statusFilter : undefined,
                call_type: callTypeFilter !== 'all' ? callTypeFilter as 'inbound' | 'outbound' : undefined,
              })
            )
          );
          // Merge and sort by date
          const mergedData = allExecutions.flatMap(r => r.data || []);
          mergedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return {
            data: mergedData.slice(0, pageSize),
            total: allExecutions.reduce((sum, r) => sum + (r.total || 0), 0),
            has_more: allExecutions.some(r => r.has_more),
            page_number: page,
            page_size: pageSize,
          };
        }
        return { data: [], total: 0, has_more: false, page_number: 1, page_size: pageSize };
      }

      return executionsApi.getByAgent(selectedAgentId, {
        page_number: page,
        page_size: pageSize,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        call_type: callTypeFilter !== 'all' ? callTypeFilter as 'inbound' | 'outbound' : undefined,
      });
    },
    enabled: !!agents,
  });

  const executions = executionsData?.data || [];
  const totalExecutions = executionsData?.total || 0;
  const hasMore = executionsData?.has_more || false;

  // Stats
  const completedCalls = executions.filter(e => e.status === 'completed').length;
  const totalDuration = executions.reduce((sum, e) => sum + (e.conversation_time || 0), 0);
  const totalCost = executions.reduce((sum, e) => sum + (e.total_cost || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': case 'error': return 'bg-red-100 text-red-700';
      case 'in-progress': case 'ringing': return 'bg-blue-100 text-blue-700';
      case 'no-answer': case 'busy': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
          <p className="text-gray-500">View all voice AI call executions</p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Calls
            </CardTitle>
            <Phone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExecutions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Completed
            </CardTitle>
            <Phone className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCalls}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Duration
            </CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Cost
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalCost / 100).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Agents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agents?.map(agent => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.agent_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="no-answer">No Answer</SelectItem>
            <SelectItem value="busy">Busy</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
          </SelectContent>
        </Select>

        <Select value={callTypeFilter} onValueChange={setCallTypeFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
            <SelectItem value="outbound">Outbound</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Calls Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 mb-2">No calls found</p>
              <p className="text-sm text-gray-400">
                Make calls using your agents to see history here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      {execution.telephony_data?.call_type === 'inbound' ? (
                        <div className="flex items-center gap-2">
                          <PhoneIncoming className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Inbound</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <PhoneOutgoing className="h-4 w-4 text-purple-500" />
                          <span className="text-sm">Outbound</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {execution.telephony_data?.to_number || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        From: {execution.telephony_data?.from_number || 'N/A'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDuration(execution.conversation_time)}
                    </TableCell>
                    <TableCell>
                      ₹{(execution.total_cost / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(execution.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {execution.telephony_data?.recording_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(execution.telephony_data?.recording_url, '_blank')}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExecution(execution)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination */}
        {executions.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-gray-500">
              Showing {executions.length} of {totalExecutions} calls
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!hasMore}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Execution Detail Dialog */}
      <Dialog open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Call Details</DialogTitle>
          </DialogHeader>

          {selectedExecution && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedExecution.status)}`}>
                    {selectedExecution.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Call Type</p>
                  <p>{selectedExecution.telephony_data?.call_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">To</p>
                  <p>{selectedExecution.telephony_data?.to_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">From</p>
                  <p>{selectedExecution.telephony_data?.from_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p>{formatDuration(selectedExecution.conversation_time)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Cost</p>
                  <p>₹{(selectedExecution.total_cost / 100).toFixed(2)}</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              {selectedExecution.cost_breakdown && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Cost Breakdown</p>
                  <div className="grid grid-cols-5 gap-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500">LLM</p>
                      <p className="font-medium">₹{(selectedExecution.cost_breakdown.llm / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500">Network</p>
                      <p className="font-medium">₹{(selectedExecution.cost_breakdown.network / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500">Platform</p>
                      <p className="font-medium">₹{(selectedExecution.cost_breakdown.platform / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500">Synthesizer</p>
                      <p className="font-medium">₹{(selectedExecution.cost_breakdown.synthesizer / 100).toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500">Transcriber</p>
                      <p className="font-medium">₹{(selectedExecution.cost_breakdown.transcriber / 100).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Transcript */}
              {selectedExecution.transcript && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Transcript</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedExecution.transcript}</p>
                  </div>
                </div>
              )}

              {/* Extracted Data */}
              {selectedExecution.extracted_data && Object.keys(selectedExecution.extracted_data).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Extracted Data</p>
                  <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(selectedExecution.extracted_data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Recording */}
              {selectedExecution.telephony_data?.recording_url && (
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Recording</p>
                  <audio
                    controls
                    className="w-full"
                    src={selectedExecution.telephony_data.recording_url}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
