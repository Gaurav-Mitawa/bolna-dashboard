/**
 * Billing Page
 * Shows wallet balance, usage stats, and billing information
 * Fully responsive for all device sizes
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { agentApi, executionsApi } from "@/lib/bolnaApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Phone,
  Clock,
  RefreshCw,
  ExternalLink,
  IndianRupee,
  Zap
} from "lucide-react";

export default function BillingPage() {
  const { user, refetchUser } = useAuth();

  // Fetch agents for usage stats
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => agentApi.getAll(),
  });

  // Fetch recent executions for cost calculation
  const { data: executionsData, isLoading: executionsLoading } = useQuery({
    queryKey: ['billing-executions'],
    queryFn: async () => {
      if (!agents || agents.length === 0) return { data: [], total: 0 };

      // Get executions from all agents
      const allExecutions = await Promise.all(
        agents.slice(0, 10).map(agent =>
          executionsApi.getByAgent(agent.id, { page_size: 50 })
        )
      );

      const mergedData = allExecutions.flatMap(r => r.data || []);
      return {
        data: mergedData,
        total: mergedData.length,
      };
    },
    enabled: !!agents && agents.length > 0,
  });

  const isLoading = agentsLoading || executionsLoading;

  // Calculate usage stats
  const executions = executionsData?.data || [];
  const totalCalls = executions.length;
  const completedCalls = executions.filter(e => e.status === 'completed').length;
  const totalDuration = executions.reduce((sum, e) => sum + (e.conversation_time || 0), 0);
  const totalCost = executions.reduce((sum, e) => sum + (e.total_cost || 0), 0);

  // Cost breakdown
  const llmCost = executions.reduce((sum, e) => sum + (e.cost_breakdown?.llm || 0), 0);
  const networkCost = executions.reduce((sum, e) => sum + (e.cost_breakdown?.network || 0), 0);
  const platformCost = executions.reduce((sum, e) => sum + (e.cost_breakdown?.platform || 0), 0);
  const synthesizerCost = executions.reduce((sum, e) => sum + (e.cost_breakdown?.synthesizer || 0), 0);
  const transcriberCost = executions.reduce((sum, e) => sum + (e.cost_breakdown?.transcriber || 0), 0);

  const walletBalance = user?.wallet || 0;
  const concurrencyUsed = user?.concurrency?.current || 0;
  const concurrencyMax = user?.concurrency?.max || 1;
  const concurrencyPercent = (concurrencyUsed / concurrencyMax) * 100;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Stat card component
  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtext,
    trend
  }: {
    icon: React.ElementType;
    label: string;
    value: string;
    subtext?: string;
    trend?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-1">{value}</h3>
            {subtext && (
              <p className="text-xs text-gray-400 mt-1">{subtext}</p>
            )}
            {trend && (
              <p className="text-xs text-green-600 mt-1 font-medium">{trend}</p>
            )}
          </div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 ml-3">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="text-xs sm:text-sm text-gray-500">Monitor your wallet balance and usage</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetchUser()}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid - Responsive 2x2 on mobile, 4 cols on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Wallet}
          label="Wallet Balance"
          value={`₹${walletBalance.toFixed(2)}`}
          subtext="Available credit"
        />
        <StatCard
          icon={Phone}
          label="Total Calls"
          value={totalCalls.toString()}
          subtext={`${completedCalls} completed`}
          trend="+12%"
        />
        <StatCard
          icon={Clock}
          label="Total Duration"
          value={formatDuration(totalDuration)}
          subtext="Conversation time"
        />
        <StatCard
          icon={IndianRupee}
          label="Total Cost"
          value={`₹${totalCost.toFixed(2)}`}
          subtext="This month"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Wallet Card - Full width on mobile */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Wallet</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage your balance</CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-9 text-xs sm:text-sm w-full sm:w-auto"
                onClick={() => window.open('https://dashboard.bolna.ai', '_blank')}
              >
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" />
                Add Funds
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-4">
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-1">Current Balance</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">₹{walletBalance.toFixed(2)}</p>
            </div>

            {/* Concurrency Usage */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-gray-600">Concurrency Usage</span>
                <span className="text-xs sm:text-sm font-medium">{concurrencyUsed} / {concurrencyMax}</span>
              </div>
              <Progress value={concurrencyPercent} className="h-1.5 sm:h-2" />
              <p className="text-xs text-gray-400 mt-1.5">{Math.round(concurrencyPercent)}% of limit used</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage billing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
              onClick={() => window.open('https://dashboard.bolna.ai', '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Open Bolna Dashboard
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-9 sm:h-10 text-xs sm:text-sm"
              onClick={() => refetchUser()}
            >
              <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />
              Refresh Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Cost Breakdown</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Detailed usage costs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              { label: 'LLM', cost: llmCost, color: 'bg-blue-500' },
              { label: 'Network', cost: networkCost, color: 'bg-green-500' },
              { label: 'Platform', cost: platformCost, color: 'bg-purple-500' },
              { label: 'Synthesizer', cost: synthesizerCost, color: 'bg-orange-500' },
              { label: 'Transcriber', cost: transcriberCost, color: 'bg-pink-500' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${item.color} mb-2`} />
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="text-base sm:text-lg font-semibold text-gray-900">₹{item.cost.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
