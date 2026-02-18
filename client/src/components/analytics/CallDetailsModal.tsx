/**
 * Call Details Modal
 * Displays rich analytics for a call including audio player, transcript, and cost
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Clock,
  IndianRupee,
  FileText,
  Headphones,
  Download,
  Copy
} from "lucide-react";
import type { CallSummary } from "@/types";
import { useState } from "react";
import { toast } from "sonner";

// =============================================================================
// PROPS INTERFACE
// =============================================================================

interface CallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: CallSummary | null;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format duration for display
 */
function formatDuration(duration: string): string {
  return duration; // Already in "M:SS" format
}

/**
 * Format cost for display
 */
function formatCost(cost?: number): string {
  if (cost === undefined || cost === null) return "N/A";
  return `₹${cost.toFixed(2)}`;
}

/**
 * Get outcome badge styling
 */
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

/**
 * Get outcome label
 */
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

/**
 * Get agent type badge styling
 */
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

/**
 * Get agent type label
 */
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

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CallDetailsModal({ isOpen, onClose, call }: CallDetailsModalProps) {
  const [isCopying, setIsCopying] = useState(false);

  if (!call) {
    return null;
  }

  /**
   * Copy transcript to clipboard
   */
  const handleCopyTranscript = async () => {
    if (!call.transcript) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(call.transcript);
      toast.success("Transcript copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy transcript");
    } finally {
      setIsCopying(false);
    }
  };

  /**
   * Download recording
   */
  const handleDownloadRecording = () => {
    if (!call.recordingUrl) return;

    // Open recording URL in new tab for download
    window.open(call.recordingUrl, "_blank");
    toast.success("Opening recording...");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-slate-800">
              Call Details
            </DialogTitle>
          </div>

          {/* Metadata badges */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${getAgentBadgeStyle(call.agentType)}`}
            >
              {getAgentLabel(call.agentType)} Agent
            </Badge>

            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${getOutcomeBadgeStyle(call.outcome)}`}
            >
              {getOutcomeLabel(call.outcome)}
            </Badge>

            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(call.duration)}
            </span>

            {call.cost !== undefined && call.cost !== null && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <IndianRupee className="w-3 h-3" />
                {formatCost(call.cost)}
              </span>
            )}

            <span className="text-xs text-slate-400 ml-auto">
              {formatDate(call.date)}
            </span>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="space-y-6 pb-4">
            {/* Summary Section */}
            {call.summary && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Summary
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-4">
                  {call.summary}
                </p>
              </div>
            )}

            {/* Audio Player Section */}
            {call.recordingUrl && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    Recording
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadRecording}
                    className="h-8 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Download
                  </Button>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <audio
                    src={call.recordingUrl}
                    controls
                    className="w-full"
                    preload="metadata"
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}

            {/* Transcript Section */}
            {call.transcript ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Transcript
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTranscript}
                    disabled={isCopying}
                    className="h-8 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1.5" />
                    {isCopying ? "Copying..." : "Copy"}
                  </Button>
                </div>
                <ScrollArea className="h-64 bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {call.transcript}
                  </p>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transcript available</p>
              </div>
            )}

            {/* Sentiment Score (if available) */}
            {call.sentimentScore !== undefined && call.sentimentScore !== null && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  Sentiment Analysis
                </h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">Sentiment Score</span>
                        <span className="text-sm font-semibold text-slate-800">
                          {call.sentimentScore}/100
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${call.sentimentScore >= 70
                            ? "bg-green-500"
                            : call.sentimentScore >= 40
                              ? "bg-amber-500"
                              : "bg-red-500"
                            }`}
                          style={{ width: `${call.sentimentScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

