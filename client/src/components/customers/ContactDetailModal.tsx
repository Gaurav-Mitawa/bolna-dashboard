/**
 * Contact Detail Modal Component (Image 2 Style)
 * History and Action tabs
 * Orange header with customer info
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  MapPin,
  Users,
  FileText,
  Zap,
  Headphones,
  Clock,
  ShoppingCart,
} from "lucide-react";
import type { Contact } from "@/types";
import type { CallHistoryItem } from "@/types";
import { cn } from "@/lib/utils";

interface ContactDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallClick: (call: CallHistoryItem) => void;
}

// Format date for display
function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}


// Get status badge styling
function getStatusBadgeStyle(tag: string): string {
  const statusMap: Record<string, string> = {
    purchased: "bg-green-100 text-green-700 border-green-200",
    converted: "bg-blue-100 text-blue-700 border-blue-200",
    fresh: "bg-orange-100 text-orange-700 border-orange-200",
    not_interested: "bg-red-100 text-red-700 border-red-200",
  };
  return statusMap[tag] || "bg-gray-100 text-gray-700 border-gray-200";
}

// Get status label
function getStatusLabel(tag: string): string {
  const labelMap: Record<string, string> = {
    purchased: "Purchased",
    converted: "Converted",
    fresh: "Fresh",
    not_interested: "Not Interested",
  };
  return labelMap[tag] || tag;
}

// Get call type badge styling
function getCallTypeStyle(type?: string): string {
  switch (type?.toLowerCase()) {
    case "inbound":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "outbound":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

// Get intent badge styling
function getIntentStyle(intent?: string): string {
  if (!intent) return "bg-gray-100 text-gray-700 border-gray-200";
  const intent_lower = intent.toLowerCase();

  if (intent_lower.includes("not_interested") || intent_lower.includes("cancelled")) {
    return "bg-red-100 text-red-700 border-red-200";
  }

  if (intent_lower.includes("booking") || intent_lower.includes("interested") || intent_lower.includes("purchased") || intent_lower.includes("converted")) {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (intent_lower.includes("follow_up") || intent_lower.includes("query")) {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return formatDate(dateString);
}

export function ContactDetailModal({
  contact,
  open,
  onOpenChange,
  onCallClick,
}: ContactDetailModalProps) {
  const [activeTab, setActiveTab] = useState("history");

  if (!contact) return null;

  const callHistory: CallHistoryItem[] = contact.call_history || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Orange Header - Image 2 Style */}
        <div className="bg-orange-500 text-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{contact.name}</h2>
              <div className="flex items-center gap-6 mt-2 text-sm text-white/90">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <Badge className={cn("text-xs border-0", getStatusBadgeStyle(contact.tag))}>
                    {getStatusLabel(contact.tag)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <div className="border-b bg-gray-50/50 px-6">
            <TabsList className="w-full justify-start h-12 bg-transparent rounded-none p-0 gap-6">
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-t-lg rounded-b-none gap-2 px-4 py-2"
              >
                <FileText className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger
                value="action"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-t-lg rounded-b-none gap-2 px-4 py-2"
              >
                <Zap className="h-4 w-4" />
                Action
              </TabsTrigger>
            </TabsList>
          </div>

          {/* History Tab Content */}
          <TabsContent value="history" className="p-6 m-0 flex-1 overflow-y-auto max-h-[calc(90vh-280px)]">
            <div className="space-y-4">
              {callHistory.length === 0 ? (
                <div className="text-center py-16">
                  <Headphones className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-1">No History Yet</p>
                  <p className="text-sm text-gray-400">
                    Call history will appear here. If you just made a call, it might take a few seconds to sync.
                  </p>
                </div>
              ) : (
                callHistory.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => onCallClick(call)}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-orange-200 cursor-pointer group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Call Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                        call.type === "inbound" ? "bg-purple-50 group-hover:bg-purple-100" : "bg-blue-50 group-hover:bg-blue-100"
                      )}>
                        <Phone className={cn(
                          "h-5 w-5",
                          call.type === "inbound" ? "text-purple-600" : "text-blue-600"
                        )} />
                      </div>

                      {/* Call Details */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] h-5 uppercase px-2", getCallTypeStyle(call.type))}
                          >
                            {call.type || "Call"}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={cn("text-[10px] h-5 px-2", getIntentStyle(call.intent))}
                          >
                            {call.intent || "No intent"}
                          </Badge>

                          {call.agent_name && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-2 bg-gray-100 text-gray-600">
                              {call.agent_name}
                            </Badge>
                          )}

                          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(call.date)}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                          {call.summary || call.transcript || "Conversation in progress or transcript pending..."}
                        </p>

                        {/* Footer - Explicit View Button */}
                        <div className="flex items-center justify-between mt-3 text-xs">
                          <div className="flex items-center gap-3">
                            {call.duration > 0 && (
                              <span className="text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                              </span>
                            )}
                            {call.cost !== undefined && call.cost > 0 && (
                              <span className="text-gray-400 flex items-center gap-1 font-medium">
                                ₹{call.cost.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            View Transcript
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Action Tab Content - Showing structured info */}
          <TabsContent value="action" className="p-6 m-0 flex-1 overflow-y-auto max-h-[calc(90vh-280px)]">
            <div className="space-y-6">
              {/* Contact Intelligence Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Source</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">{contact.source}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lead Status</p>
                  <Badge className={cn("mt-1", getStatusBadgeStyle(contact.tag))}>
                    {getStatusLabel(contact.tag)}
                  </Badge>
                </div>
              </div>

              {/* Last Call Data if exists */}
              {contact.last_call_summary && (
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Latest Intelligence
                  </h3>
                  <div className="bg-white/80 rounded-lg p-4 border border-orange-100">
                    <p className="text-sm text-gray-700 leading-relaxed italic">
                      "{contact.last_call_summary}"
                    </p>
                    {contact.last_call_agent && (
                      <p className="text-[10px] text-orange-600 mt-2 font-medium">
                        Captured by {contact.last_call_agent} on {contact.last_call_date ? formatDate(contact.last_call_date) : 'recent call'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Coming Soon Placeholder for more complex actions */}
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 text-center">
                <ShoppingCart className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-blue-900">Booking Integration</p>
                <p className="text-xs text-blue-700 mt-1">
                  Direct booking and PMS integration will be available here.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <p className="text-xs text-gray-500">
            Last updated: {contact.updated_at ? new Date(contact.updated_at).toLocaleString() : "N/A"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContactDetailModal;
