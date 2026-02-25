/**
 * Contact Detail Modal Component
 * Shows CRM customer details with pastConversations history
 */

import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  Users,
  FileText,
  Zap,
  MessageSquare,
  Clock,
  ShoppingCart,
} from "lucide-react";
import type { CrmCustomer } from "@/api/crm";
import { cn } from "@/lib/utils";

interface ContactDetailModalProps {
  contact: CrmCustomer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusMap: Record<string, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "bg-orange-100 text-orange-700 border-orange-200" },
  interested: { label: "Interested", className: "bg-blue-100 text-blue-700 border-blue-200" },
  not_interested: { label: "Not Interested", className: "bg-red-100 text-red-700 border-red-200" },
  booked: { label: "Booked", className: "bg-green-100 text-green-700 border-green-200" },
  NA: { label: "N/A", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
}: ContactDetailModalProps) {
  const [activeTab, setActiveTab] = useState("history");

  if (!contact) return null;

  const statusConfig = statusMap[contact.status] || statusMap.fresh;
  const conversations = contact.pastConversations || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Orange Header */}
        <div className="bg-orange-500 text-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Users className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{contact.name}</h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-white/90 flex-wrap">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>{contact.phoneNumber || "N/A"}</span>
                </div>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{contact.email}</span>
                  </div>
                )}
                <Badge className={cn("text-xs border-0", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <div className="border-b bg-gray-50/50 px-6">
            <TabsList className="w-full justify-start h-12 bg-transparent rounded-none p-0 gap-6">
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-t-lg rounded-b-none gap-2 px-4 py-2"
              >
                <FileText className="h-4 w-4" />
                History ({conversations.length})
              </TabsTrigger>
              <TabsTrigger
                value="action"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-t-lg rounded-b-none gap-2 px-4 py-2"
              >
                <Zap className="h-4 w-4" />
                Details
              </TabsTrigger>
            </TabsList>
          </div>

          {/* History Tab */}
          <TabsContent
            value="history"
            className="p-6 m-0 flex-1 overflow-y-auto max-h-[calc(90vh-280px)]"
          >
            <div className="space-y-4">
              {conversations.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-1">No Conversations Yet</p>
                  <p className="text-sm text-gray-400">
                    Past conversation notes will appear here when added.
                  </p>
                </div>
              ) : (
                [...conversations].reverse().map((conv, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(conv.date)}
                          </span>
                          <span className="text-xs text-gray-500">{formatDate(conv.date)}</span>
                        </div>
                        {conv.summary && (
                          <p className="text-sm text-gray-700 leading-relaxed mb-2">
                            <span className="font-medium text-gray-900">Summary: </span>
                            {conv.summary}
                          </p>
                        )}
                        {conv.notes && (
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                            <span className="font-medium text-gray-700">Notes: </span>
                            {conv.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent
            value="action"
            className="p-6 m-0 flex-1 overflow-y-auto max-h-[calc(90vh-280px)]"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Lead Status
                  </p>
                  <Badge className={cn("mt-1", statusConfig.className)}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Conversations
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{conversations.length}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Contact Info
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{contact.phoneNumber}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {conversations.length > 0 && (
                <div className="bg-orange-50 rounded-xl p-5 border border-orange-100">
                  <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Latest Conversation
                  </h3>
                  <div className="bg-white/80 rounded-lg p-4 border border-orange-100">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {conversations[conversations.length - 1].summary ||
                        conversations[conversations.length - 1].notes ||
                        "No details available."}
                    </p>
                    <p className="text-[10px] text-orange-600 mt-2 font-medium">
                      {formatDate(conversations[conversations.length - 1].date)}
                    </p>
                  </div>
                </div>
              )}

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
            Added: {formatDate(contact.createdAt)} · Last updated:{" "}
            {formatDate(contact.updatedAt)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContactDetailModal;
