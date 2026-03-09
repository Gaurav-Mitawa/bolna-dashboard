/**
 * Booking Detail Modal
 * Shows full details of an LLM-processed call booking with:
 * - Fixed date/time display (isNaN guard)
 * - EN/HI summary language toggle
 * - Inline summary edit (saves to /api/call-bookings/:id)
 */

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Calendar, Clock, FileText, ArrowUpDown, Timer, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/api/bookings";

interface BookingDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking?: Booking | null;
}

const intentBadge: Record<string, { label: string; className: string }> = {
  booked: {
    label: "Booked",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  interested: {
    label: "Interested",
    className: "bg-blue-100 text-blue-700 border-blue-300",
  },
  follow_up: {
    label: "Follow Up",
    className: "bg-purple-100 text-purple-700 border-purple-300",
  },
  queries: {
    label: "Queries",
    className: "bg-amber-100 text-amber-700 border-amber-300",
  },
  not_interested: {
    label: "Not Interested",
    className: "bg-red-100 text-red-600 border-red-300",
  },
};

export function BookingDetailModal({ open, onOpenChange, booking }: BookingDetailModalProps) {
  const queryClient = useQueryClient();
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [isEditing, setIsEditing] = useState(false);
  const [editedSummary, setEditedSummary] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!booking) return null;

  const intent = intentBadge[booking.intent_category] || intentBadge.queries;

  // Format date with isNaN guard — prevents "undefined NaN, NaN"
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "—"; // guard: Invalid Date renders as-is
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  };

  // Format duration — treat 0 as valid (not missing)
  const formatDuration = (seconds: number): string => {
    if (seconds == null || isNaN(seconds)) return "—";
    if (seconds === 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleEditOpen = () => {
    setEditedSummary(booking.summary || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/call-bookings/${booking.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: editedSummary }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Summary updated successfully");
      queryClient.invalidateQueries({ queryKey: ["bookings-booked"] });
      queryClient.invalidateQueries({ queryKey: ["bookings-all"] });
      setIsEditing(false);
    } catch {
      toast.error("Failed to save summary. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Pick the summary to display based on language toggle
  const displaySummary =
    lang === "hi"
      ? booking.summary_hi || booking.summary || "No Hindi summary available"
      : booking.summary_en || booking.summary || "No summary available";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-4">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  {booking.contact_name}
                </DialogTitle>
                <p className="text-sm text-orange-100 mt-0.5">
                  {booking.call_direction === "inbound" ? "Inbound Call" : "Outbound Call"}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${intent.className}`}
              >
                {intent.label}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="p-6 bg-white space-y-5">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-800">
            <InfoRow
              icon={<Phone className="h-4 w-4 text-gray-400" />}
              label="Phone"
              value={booking.caller_number || "—"}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4 text-gray-400" />}
              label="Call Date"
              value={formatDate(booking.call_date || booking.service_date_raw)}
            />
            <InfoRow
              icon={<Calendar className="h-4 w-4 text-orange-400" />}
              label="Booking Date"
              value={formatDate(booking.service_date)}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4 text-gray-400" />}
              label="Booking Time"
              value={booking.service_time || "—"}
            />
            <InfoRow
              icon={<Timer className="h-4 w-4 text-gray-400" />}
              label="Duration"
              value={formatDuration(booking.call_duration)}
            />
            <InfoRow
              icon={<ArrowUpDown className="h-4 w-4 text-gray-400" />}
              label="Direction"
              value={booking.call_direction ? booking.call_direction.charAt(0).toUpperCase() + booking.call_direction.slice(1) : "—"}
            />
          </div>

          {/* Status */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Status:</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${booking.status === "confirmed"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : booking.status === "pending"
                    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                    : "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
              >
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
          </div>

          {/* AI Summary — with EN/HI toggle + inline edit */}
          {(booking.summary || booking.summary_en || booking.summary_hi) && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium text-gray-700">AI Summary</span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Language toggle */}
                  <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs">
                    <button
                      onClick={() => setLang("en")}
                      className={`px-2.5 py-1 font-medium transition-colors ${lang === "en" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => setLang("hi")}
                      className={`px-2.5 py-1 font-medium transition-colors border-l border-gray-200 ${lang === "hi" ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                    >
                      हि
                    </button>
                  </div>
                  {/* Edit toggle */}
                  {!isEditing && (
                    <button
                      onClick={handleEditOpen}
                      title="Edit summary"
                      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full text-sm text-gray-700 bg-purple-50 rounded-lg p-3 border border-purple-200 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    placeholder="Enter updated summary..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={isSaving}
                      className="text-xs text-gray-500 px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-md hover:bg-orange-600 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 bg-purple-50 rounded-lg p-3 border border-purple-100">
                  {displaySummary}
                </p>
              )}
            </div>
          )}

          {/* Transcript (collapsed by default) */}
          {booking.transcript && (
            <details className="pt-4 border-t border-gray-100">
              <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
                📜 View Full Transcript
              </summary>
              <div className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {booking.transcript}
              </div>
            </details>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
