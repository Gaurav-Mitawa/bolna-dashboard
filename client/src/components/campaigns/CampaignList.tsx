/**
 * Campaign List Component
 * Displays list of active campaigns
 * Fully responsive for mobile and desktop
 */
import { Campaign } from "@/api/bolnaCampaigns";
import { CampaignCard } from "./CampaignCard";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Users } from "lucide-react";

interface CampaignListProps {
  campaigns: Campaign[];
  onAddCampaign: () => void;
  onStatusChange: (campaignId: string, statusTags: string[]) => void;
  onTogglePlay: (campaignId: string, isPlaying: boolean) => void;
  onViewDetails: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
  isLoading?: boolean;
}

export function CampaignList({
  campaigns,
  onAddCampaign,
  onStatusChange,
  onTogglePlay,
  onViewDetails,
  onDelete,
  isLoading = false,
}: CampaignListProps) {
  const activeCampaigns = campaigns.filter(c => c.isActive);
  const inactiveCampaigns = campaigns.filter(c => !c.isActive);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Campaign Agents</h2>
            <p className="text-xs sm:text-sm text-gray-500">
              {activeCampaigns.length} active, {inactiveCampaigns.length} inactive
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
          <span className="text-xs sm:text-sm text-gray-500">
            {campaigns.length} / 10 campaigns
          </span>
          <Button 
            onClick={onAddCampaign}
            variant="outline"
            className="gap-1.5 sm:gap-2 h-9 sm:h-10 text-xs sm:text-sm"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Add Agent</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="space-y-3 sm:space-y-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-dashed border-gray-300 px-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-1 sm:mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-3 sm:mb-4 text-sm">Create your first campaign to start outbound calling</p>
            <Button onClick={onAddCampaign} className="h-9 sm:h-10 text-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStatusChange={onStatusChange}
              onTogglePlay={onTogglePlay}
              onViewDetails={onViewDetails}
              onDelete={onDelete}
              isLoading={isLoading}
            />
          ))
        )}
      </div>
    </div>
  );
}
