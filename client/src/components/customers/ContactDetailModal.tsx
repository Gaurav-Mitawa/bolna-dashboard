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
} from "lucide-react";
import type { Contact, CallHistoryItem } from "@/api/bolnaContacts";
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

// Format time for display
function formatTime(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
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
                    Call history will appear here
                  </p>
                </div>
              ) : (
                callHistory.map((call) => (
                  <div
                    key={call.id}
                    onClick={() => onCallClick(call)}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-orange-200 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Call Icon */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                        call.type === "inbound" ? "bg-purple-100" : "bg-blue-100"
                      )}>
                        <Phone className={cn(
                          "h-6 w-6",
                          call.type === "inbound" ? "text-purple-600" : "text-blue-600"
                        )} />
                      </div>

                      {/* Call Details */}
                      <div className="flex-1 min-w-0">
                        {/* Header Row */}
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={cn("text-xs capitalize", getCallTypeStyle(call.type))}
                          >
                            {call.type || "Call"}
                          </Badge>

                          <span className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(call.date)}
                          </span>

                          <Badge
                            variant="outline"
                            className={cn("text-xs", getIntentStyle(call.intent))}
                          >
                            {call.intent || "No intent"}
                          </Badge>

                          <span className="text-xs text-gray-400 ml-auto">
                            {formatRelativeTime(call.date)}
                          </span>
                        </div>

                        {/* Summary */}
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                          {call.summary || "No transcript available"}
                        </p>

                        {/* Footer */}
                        {call.recording_url && (
                          <div className="flex items-center gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(call.recording_url, "_blank");
                              }}
                              className="h-8 text-xs"
                            >
                              <Headphones className="h-3.5 w-3.5 mr-1" />
                              Listen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Action Tab Content */}
          <TabsContent value="action" className="p-6 m-0 flex-1 overflow-y-auto">
            <div className="text-center py-16">
              <Zap className="h-16 w-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-1">Coming Soon</p>
              <p className="text-sm text-gray-400">
                Action features will be available here
              </p>
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
