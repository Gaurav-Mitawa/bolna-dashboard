/**
 * List View Component for Bookings
 * Shows both "Booked" and "Queries" calls with intent badges
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Phone,
  Filter,
  CalendarDays,
  Eye,
} from "lucide-react";
import type { Booking } from "@/api/bookings";

type BookingStatus = "confirmed" | "pending" | "completed" | "cancelled" | "all";

const statusColor: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

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

interface ListViewProps {
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
}

export function ListView({ bookings, onBookingClick }: ListViewProps) {
  const [activeFilter, setActiveFilter] = useState<BookingStatus>("all");

  // Helper function to format date
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  // Format call duration
  const formatDuration = (seconds: number): string => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Filter bookings
  const filtered = useMemo(() => {
    if (activeFilter === "all") return bookings;
    return bookings.filter((b) => b.status === activeFilter);
  }, [bookings, activeFilter]);

  const pills: { label: string; value: BookingStatus }[] = [
    { label: "All Status", value: "all" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Pending", value: "pending" },
    { label: "Completed", value: "completed" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex w-full overflow-x-auto pb-2 sm:pb-0 hide-scrollbar items-center gap-3">
          <span className="text-sm text-gray-700 flex items-center gap-2 font-medium whitespace-nowrap">
            <Filter className="h-4 w-4 text-gray-500" /> Filter by:
          </span>
          <div className="flex items-center gap-2">
            {pills.map((pill) => (
              <Button
                key={pill.value}
                size="sm"
                variant={activeFilter === pill.value ? "default" : "outline"}
                onClick={() => setActiveFilter(pill.value)}
                className={`whitespace-nowrap ${activeFilter === pill.value
                  ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {pill.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filtered.length}</span> of{" "}
          <span className="font-semibold">{bookings.length}</span> bookings
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 whitespace-nowrap sm:px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((booking) => {
                const intent = intentBadge[booking.intent_category] || intentBadge.queries;

                return (
                  <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {booking.contact_name}
                      </p>
                      {booking.caller_number && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs">{booking.caller_number}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate" title={booking.service_name}>
                        {booking.service_name}
                      </p>
                      {booking.call_direction && (
                        <span className="text-xs text-gray-400 capitalize">
                          {booking.call_direction}
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <div className="flex items-center gap-2 text-sm text-gray-800 whitespace-nowrap">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(booking.service_date)}</span>
                      </div>
                      {booking.service_time && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1 whitespace-nowrap">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{booking.service_time}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <p className="text-sm text-gray-700 whitespace-nowrap">
                        {formatDuration(booking.call_duration)}
                      </p>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${intent.className}`}
                      >
                        {intent.label}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${statusColor[booking.status] || statusColor.pending
                          }`}
                      >
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => onBookingClick?.(booking)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 sm:px-6 py-12 text-center text-gray-400 text-sm">
                    No bookings match the selected filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
