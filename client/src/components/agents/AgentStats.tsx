/**
 * Agent Stats Component
 * Shows 4 statistic cards for Voice Agent Management
 */
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Bot, Clock } from "lucide-react";

interface AgentStatsProps {
  stats: {
    total_calls: number;
    active_agents: number;
    total_agents: number;
    total_minutes: number;
  } | null;
  isLoading: boolean;
}

export function AgentStats({ stats, isLoading }: AgentStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="h-32">
            <CardContent className="flex items-center justify-center h-full">
              <div className="animate-pulse flex space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Calls",
      value: stats.total_calls.toLocaleString(),
      trendUp: true,
      icon: Phone,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Active Agents",
      value: `${stats.active_agents}/${stats.total_agents}`,
      trendUp: true,
      icon: Bot,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      title: "Total Minutes",
      value: stats.total_minutes.toLocaleString(),
      icon: Clock,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500 mb-1">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {card.value}
                </p>

              </div>
              <div
                className={`w-12 h-12 rounded-xl ${card.iconBg} flex items-center justify-center`}
              >
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
