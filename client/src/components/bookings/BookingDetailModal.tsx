/**
 * Booking Detail Modal
 * Shows full details of an LLM-processed call booking
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Calendar, Clock, FileText, ArrowUpDown, Timer } from "lucide-react";
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
  if (!booking) return null;

  const intent = intentBadge[booking.intent_category] || intentBadge.queries;

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

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
              label="Date"
              value={formatDate(booking.service_date)}
            />
            <InfoRow
              icon={<Clock className="h-4 w-4 text-gray-400" />}
              label="Time"
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

          {/* AI Summary */}
          {booking.summary && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-700">AI Summary</span>
              </div>
              <p className="text-sm text-gray-600 bg-purple-50 rounded-lg p-3 border border-purple-100">
                {booking.summary}
              </p>
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
