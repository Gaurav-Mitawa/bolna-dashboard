/**
 * Call Summary Modal - Image 4 Style
 * Displays call details and transcript
 * No duration field as requested
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  IndianRupee,
  User,
  Calendar,
  FileText,
  Headphones,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { CallHistoryItem } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CallSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: CallHistoryItem | null;
}

// Format cost for display (in Rupees)
function formatCost(cost?: number): string {
  if (cost === undefined || cost === null) return "N/A";
  return `₹${cost.toFixed(2)}`;
}

// Get status badge styling
function getStatusBadgeStyle(status?: string): string {
  switch (status?.toLowerCase()) {
    case "completed":
    case "answered":
      return "bg-green-50 text-green-700 border-green-200";
    case "declined":
    case "busy":
    case "dropped":
      return "bg-red-50 text-red-700 border-red-200";
    case "voicemail":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "no_answer":
    case "no-answer":
    case "no answer":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

// Get status icon
function getStatusIcon(status?: string) {
  switch (status?.toLowerCase()) {
    case "completed":
    case "answered":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "declined":
    case "busy":
    case "dropped":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "voicemail":
      return <AlertCircle className="h-4 w-4 text-amber-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-slate-600" />;
  }
}

// Get call type badge styling
function getCallTypeStyle(type?: string): string {
  switch (type?.toLowerCase()) {
    case "outbound":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "inbound":
      return "bg-purple-50 text-purple-700 border-purple-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

// Format date for display
function formatDate(dateString?: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format time for display
function formatTime(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CallSummaryModal({ isOpen, onClose, call }: CallSummaryModalProps) {
  const [showHindi, setShowHindi] = useState(false);

  if (!call) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
        {/* Header - Image 4 Style */}
        <DialogHeader className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Call Details
          </DialogTitle>

          {/* Badges Row */}
          <div className="flex items-center gap-2 mt-3">
            <Badge
              variant="outline"
              className={cn("text-xs px-3 py-1", getCallTypeStyle(call.type))}
            >
              <Phone className="w-3 h-3 mr-1" />
              {call.type || "Call"}
            </Badge>

            {call.status && (
              <Badge
                variant="outline"
                className={cn("text-xs px-3 py-1", getStatusBadgeStyle(call.status))}
              >
                {getStatusIcon(call.status)}
                <span className="ml-1 capitalize">{call.status.replace(/-/g, " ")}</span>
              </Badge>
            )}

            <span className="text-xs text-gray-500 flex items-center gap-1 ml-auto">
              <Calendar className="w-3 h-3" />
              {formatDate(call.date)}, {formatTime(call.date)}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* Info Boxes - Image 4 Style (No Duration) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <IndianRupee className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Cost</span>
                </div>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCost(call.cost)}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wider">Agent</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 truncate">
                  {call.agent_name || "AI Agent"}
                </p>
              </div>
            </div>

            {/* AI Summary Section (If available) */}
            {call.summary && call.summary !== call.transcript && (
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-100 shadow-sm">
                <h3 className="text-sm font-bold text-orange-800 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  AI Summary
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowHindi(false)}
                    className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                      !showHindi
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    EN
                  </button>
                  {call.summary_hi && (
                    <button
                      onClick={() => setShowHindi(true)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                        showHindi
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      HI
                    </button>
                  )}
                </div>
                <div className="bg-white/80 rounded-lg p-4 border border-orange-100">
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    {showHindi && call.summary_hi ? call.summary_hi : call.summary_en || call.summary}
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {call.intent && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Intent:</span>
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300">
                        {call.intent.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  )}
                  {call.next_step && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                        Next Step
                      </p>
                      <p className="text-sm text-blue-900">
                        {call.next_step}
                      </p>
                    </div>
                  )}
                  {call.sentiment && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Sentiment:</span>
                      <Badge
                        variant="outline"
                        className={
                          call.sentiment === "positive"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : call.sentiment === "negative"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }
                      >
                        {call.sentiment.charAt(0).toUpperCase() + call.sentiment.slice(1)}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Full Transcript Section */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm">
              <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Full Conversation Transcript
              </h3>
              <div className="bg-white rounded-lg p-5 border border-blue-100 min-h-[300px]">
                {call.transcript ? (
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
                    {call.transcript}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                    <p className="text-xs italic">Transcript is being processed or was not captured for this call.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recording Section */}
            {call.recording_url && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Headphones className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Call Recording</h3>
                    <p className="text-xs text-gray-500">Listen to the full conversation</p>
                  </div>
                </div>
                <audio
                  controls
                  src={call.recording_url}
                  className="w-full"
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </div>


      </DialogContent>
    </Dialog>
  );
}

export default CallSummaryModal;
