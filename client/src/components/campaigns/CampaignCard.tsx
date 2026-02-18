/**
 * Campaign Card Component
 * Individual campaign card with controls
 * Fully responsive for mobile and desktop
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Campaign } from "@/api/bolnaCampaigns";
import { 
  Play, 
  Pause, 
  MoreVertical, 
  FileText, 
  Trash2,
  Bot,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: Campaign;
  onStatusChange: (campaignId: string, statusTags: string[]) => void;
  onTogglePlay: (campaignId: string, isPlaying: boolean) => void;
  onViewDetails: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  isLoading?: boolean;
}

const statusOptions = [
  { value: "fresh", label: "Fresh" },
  { value: "purchased", label: "Purchased" },
  { value: "converted", label: "Converted" },
  { value: "fresh_na", label: "Fresh - NA" },
  { value: "not_interested", label: "Not Interested" },
];

export function CampaignCard({
  campaign,
  onStatusChange,
  onTogglePlay,
  onViewDetails,
  onDelete,
  isLoading = false,
}: CampaignCardProps) {
  // Format status for display
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      created: { label: "Created", className: "bg-gray-100 text-gray-700" },
      scheduled: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
      queued: { label: "Queued", className: "bg-yellow-100 text-yellow-700" },
      executed: { label: "Running", className: "bg-green-100 text-green-700" },
      stopped: { label: "Stopped", className: "bg-red-100 text-red-700" },
    };
    
    const config = statusMap[status] || statusMap.created;
    return (
      <Badge className={cn("text-xs", config.className)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
      {/* Top Section: Agent info and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left side: Agent info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
            <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          
          {/* Name and badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {campaign.agentName.length > 15 
                  ? campaign.agentName.slice(0, 15) + "..." 
                  : campaign.agentName}
              </h3>
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-orange-50 text-orange-700 border-orange-200 flex-shrink-0">
                Main
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {getStatusBadge(campaign.status)}
              <span className="text-xs text-gray-500">
                {campaign.totalContacts > 0
                  ? `${campaign.validContacts || 0}/${campaign.totalContacts} calls`
                  : "No calls yet"}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Controls - Stack on mobile */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Status Tag Selector - Full width on mobile */}
          <div className="flex items-center gap-2 w-full sm:w-auto order-3 sm:order-none">
            <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap hidden sm:inline">Status Tag</span>
            <Select
              value={campaign.statusTag[0] || "fresh"}
              onValueChange={(value) => onStatusChange(campaign.id, [value])}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full sm:w-40 h-8 sm:h-9 text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-sm">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 order-1 sm:order-none">
            {/* View Details Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => onViewDetails(campaign.id)}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 text-gray-600" />
            </Button>

            {/* Play/Pause Button */}
            <Button
              variant={campaign.isActive ? "default" : "outline"}
              size="icon"
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9",
                campaign.isActive 
                  ? "bg-orange-500 hover:bg-orange-600 text-white" 
                  : "border-green-500 text-green-600 hover:bg-green-50"
              )}
              onClick={() => onTogglePlay(campaign.id, !campaign.isActive)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : campaign.isActive ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9">
                  <MoreVertical className="h-4 w-4 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onDelete(campaign.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Campaign
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {campaign.totalContacts > 0 && (
        <div className="mt-3 sm:mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{Math.round(((campaign.validContacts || 0) / campaign.totalContacts) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div 
              className="bg-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${((campaign.validContacts || 0) / campaign.totalContacts) * 100}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 gap-1">
        <span>
          Created: {new Date(campaign.createdAt).toLocaleDateString()}
        </span>
        {campaign.scheduledAt && (
          <span className="text-blue-600">
            Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
