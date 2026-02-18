/**
 * Campaign Analytics Component
 * Shows Call Intent and Call Status donut charts
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignAnalytics as Analytics, CallType } from "@/api/bolnaCampaigns";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CampaignAnalyticsProps {
  analytics: Analytics | null;
  isLoading: boolean;
  onRefresh: () => void;
  callType: CallType;
  onCallTypeChange: (type: CallType) => void;
  dateRange: string;
  onDateRangeChange: (range: string) => void;
}

const dateRangeOptions = [
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

export function CampaignAnalytics({ 
  analytics, 
  isLoading, 
  onRefresh,
  callType,
  onCallTypeChange,
  dateRange,
  onDateRangeChange,
}: CampaignAnalyticsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="h-80">
            <CardContent className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const callIntent = analytics?.callIntent || { 
    booked: 0, notInterested: 0, followUp: 0, cancelled: 0, queries: 0, total: 0 
  };
  const callStatus = analytics?.callStatus || { 
    answered: 0, notAnswered: 0, officeHours: 0, nonOfficeHours: 0, total: 0 
  };

  // Calculate data based on call type
  const isOutbound = callType === "outbound";
  
  // Call Intent Data
  const intentData = isOutbound 
    ? [
        { label: "Booked", value: callIntent.booked, color: "#3B82F6" },
        { label: "Not Interested", value: callIntent.notInterested, color: "#EF4444" },
        { label: "Follow-up", value: callIntent.followUp, color: "#F97316" },
      ]
    : [
        { label: "Booked", value: callIntent.booked, color: "#3B82F6" },
        { label: "Cancelled", value: callIntent.cancelled, color: "#EF4444" },
        { label: "Queries", value: callIntent.queries, color: "#10B981" },
      ];

  // Call Status Data
  const statusData = isOutbound
    ? [
        { label: "Answered", value: callStatus.answered, color: "#3B82F6" },
        { label: "Not Answered", value: callStatus.notAnswered, color: "#EF4444" },
      ]
    : [
        { label: "Office Hours", value: callStatus.officeHours, color: "#10B981" },
        { label: "Non-Office Hours", value: callStatus.nonOfficeHours, color: "#F97316" },
      ];

  // Calculate percentages
  const calculatePercentages = (data: { label: string; value: number; color: string }[]) => {
    const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
    return data.map(item => ({
      ...item,
      percent: (item.value / total) * 100,
    }));
  };

  const intentDataWithPercent = calculatePercentages(intentData);
  const statusDataWithPercent = calculatePercentages(statusData);

  // Generate SVG donut chart
  const DonutChart = ({ 
    data, 
    total, 
    subtitle 
  }: { 
    data: { label: string; value: number; color: string; percent: number }[]; 
    total: number; 
    subtitle: string;
  }) => {
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="24"
            />
            {/* Data segments */}
            {data.map((segment, index) => {
              const segmentLength = (segment.percent / 100) * circumference;
              const dashArray = `${segmentLength} ${circumference}`;
              const dashOffset = -currentOffset;
              currentOffset += segmentLength;
              
              return (
                <circle
                  key={index}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="24"
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{total}</span>
            <span className="text-sm text-gray-500">{subtitle}</span>
          </div>
        </div>
        
        {/* Legend with counts */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-gray-600">
                {item.label}: <strong>{item.value}</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-end gap-3">
        <Select value={dateRange} onValueChange={onDateRangeChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={callType} onValueChange={(value) => onCallTypeChange(value as CallType)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outbound">Outbound</SelectItem>
            <SelectItem value="inbound">Inbound</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onRefresh}>
          <Download className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Intent Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Call Intent</CardTitle>
              <p className="text-sm text-gray-500">
                {isOutbound ? "Lead conversion analysis" : "Customer inquiry analysis"}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart 
              data={intentDataWithPercent} 
              total={isOutbound 
                ? callIntent.booked + callIntent.notInterested + callIntent.followUp
                : callIntent.booked + callIntent.cancelled + callIntent.queries
              }
              subtitle={isOutbound ? "Total Leads" : "Total Inquiries"}
            />
          </CardContent>
        </Card>

        {/* Call Status Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Call Status</CardTitle>
              <p className="text-sm text-gray-500">
                {isOutbound ? "Call outcome breakdown" : "Call timing breakdown"}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={statusDataWithPercent}
              total={isOutbound
                ? callStatus.answered + callStatus.notAnswered
                : callStatus.officeHours + callStatus.nonOfficeHours
              }
              subtitle="Total Calls"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
