import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, User, Mail, Phone, History, Clock } from "lucide-react";
import type { Contact, CallSummary } from "@/types";
import { CallDetailsModal } from "@/components/analytics/CallDetailsModal";

// =============================================================================
// PERSONALIZATION TAB
// Top Section: Client Info (Company, Name, Email, Phone)
// Bottom Section: Interaction History (Call Summaries)
// =============================================================================

interface PersonalizationTabProps {
  contact: Contact;
}

// -----------------------------------------------------------------------------
// HELPER: Format date for display
// -----------------------------------------------------------------------------

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// -----------------------------------------------------------------------------
// HELPER: Get ordinal suffix (1st, 2nd, 3rd, etc.)
// -----------------------------------------------------------------------------

function getOrdinal(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const value = n % 100;
  // Handle special cases: 11th, 12th, 13th
  if (value >= 11 && value <= 13) {
    return `${n}th`;
  }
  return `${n}${suffixes[value % 10] || suffixes[0]}`;
}

// -----------------------------------------------------------------------------
// HELPER: Get outcome badge styling
// -----------------------------------------------------------------------------

function getOutcomeBadgeStyle(outcome: string): string {
  switch (outcome) {
    case "answered":
      return "bg-green-50 text-green-700 border-green-200";
    case "declined":
      return "bg-red-50 text-red-700 border-red-200";
    case "voicemail":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "no_answer":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

// -----------------------------------------------------------------------------
// HELPER: Get outcome label
// -----------------------------------------------------------------------------

function getOutcomeLabel(outcome: string): string {
  switch (outcome) {
    case "answered":
      return "Answered";
    case "declined":
      return "Declined";
    case "voicemail":
      return "Voicemail";
    case "no_answer":
    default:
      return "No Answer";
  }
}

// -----------------------------------------------------------------------------
// HELPER: Get agent type badge styling
// -----------------------------------------------------------------------------

function getAgentBadgeStyle(agentType: CallSummary["agentType"]): string {
  switch (agentType) {
    case "main":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "follow_up":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "inbound":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

// -----------------------------------------------------------------------------
// HELPER: Get agent type label
// -----------------------------------------------------------------------------

function getAgentLabel(agentType: CallSummary["agentType"]): string {
  switch (agentType) {
    case "main":
      return "Main";
    case "follow_up":
      return "Follow-up";
    case "inbound":
      return "Inbound";
    default:
      return "Unknown";
  }
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function PersonalizationTab({ contact }: PersonalizationTabProps) {
  const [selectedCall, setSelectedCall] = useState<CallSummary | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  const handleCallClick = (call: CallSummary) => {
    setSelectedCall(call);
    setIsCallModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ===================================================================== */}
      {/* TOP SECTION: Client Info Grid */}
      {/* ===================================================================== */}
      <div className="p-4 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-3">
          {/* Company Name */}
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Company</p>
              <p className="text-sm font-medium text-slate-800 truncate">
                {contact.companyName || "N/A"}
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Name</p>
              <p className="text-sm font-medium text-slate-800 truncate">{contact.name}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium text-slate-800 truncate">{contact.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Phone className="w-4 h-4 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-medium text-slate-800 truncate">{contact.phone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BOTTOM SECTION: Interaction History */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Section Header */}
        <div className="px-4 py-3 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Interaction History</h3>
          <span className="text-xs text-slate-400">({contact.callSummaries.length})</span>
        </div>

        {/* Call History List */}
        <ScrollArea className="flex-1 px-4 pb-4">
          {contact.callSummaries.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No interactions yet</p>
            </div>
          ) : (
            /* Call Summary Rows - Numbered format: 1st, 2nd, 3rd Call Summary */
            <div className="space-y-3">
              {contact.callSummaries.map((call, index) => (
                <div
                  key={call.id}
                  onClick={() => handleCallClick(call)}
                  className="bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors overflow-hidden cursor-pointer"
                >
                  {/* Header: Nth Call Summary with Client */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200/50">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">
                        {getOrdinal(index + 1)} Call Summary
                      </h4>
                      <span className="text-xs text-slate-400">
                        {formatDate(call.date)}
                      </span>
                    </div>
                  </div>

                  {/* Call Details */}
                  <div className="p-4 space-y-3">
                    {/* Badges Row: Agent Type | Outcome | Duration */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Agent Type Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${getAgentBadgeStyle(call.agentType)}`}
                      >
                        {getAgentLabel(call.agentType)} Agent
                      </Badge>

                      {/* Outcome Badge */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 ${getOutcomeBadgeStyle(call.outcome)}`}
                      >
                        {getOutcomeLabel(call.outcome)}
                      </Badge>

                      {/* Duration */}
                      <span className="text-[10px] text-slate-400 ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {call.duration}
                      </span>
                    </div>

                    {/* Summary Text */}
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {call.summary}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Call Details Modal */}
      <CallDetailsModal
        isOpen={isCallModalOpen}
        onClose={() => {
          setIsCallModalOpen(false);
          setSelectedCall(null);
        }}
        call={selectedCall}
      />
    </div>
  );
}

export default PersonalizationTab;

