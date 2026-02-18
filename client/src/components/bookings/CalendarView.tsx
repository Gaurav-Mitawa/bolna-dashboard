/**
 * Sleek Calendar View Component
 * Week-based calendar showing only "booked" calls as booking cards
 */

import { Badge } from "@/components/ui/badge";
import { Box, Phone } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import type { Booking } from "@/api/bookings";

interface CalendarViewProps {
  weekNumber: number;
  dateRange: string;
  startDate: Date;
  endDate: Date;
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
}

export function CalendarView({
  weekNumber,
  dateRange,
  startDate,
  bookings,
  onBookingClick,
}: CalendarViewProps) {
  // Generate 7 days for the week (Monday to Sunday)
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const totalBookings = bookings.length;

  // Get bookings for a specific day
  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking) => {
      if (!booking.service_date) return false;
      const bookingDate = new Date(booking.service_date);
      return isSameDay(bookingDate, day);
    });
  };

  // Format day display
  const formatDayLabel = (date: Date) => {
    return `${format(date, "dd")} ${format(date, "EEE")}`;
  };

  return (
    <div className="space-y-4">
      {/* Purple Header Banner */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl px-6 py-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center">
            <span className="text-sm font-bold">{weekNumber}</span>
          </div>
          <div>
            <p className="text-lg font-bold">Week {weekNumber}</p>
            <p className="text-sm text-white/90">{dateRange}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="text-2xl font-bold">{totalBookings}</span>
          <span>Total Bookings</span>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-4">
        {days.map((day) => {
          const dayBookings = getBookingsForDay(day);
          const hasBookings = dayBookings.length > 0;

          return (
            <div
              key={day.toISOString()}
              className={`border rounded-xl p-3 bg-white space-y-3 min-h-[280px] transition-all duration-200 ${hasBookings
                  ? "border-gray-200 shadow-md hover:shadow-lg hover:border-purple-200"
                  : "border-gray-100 shadow-sm"
                }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">
                  {formatDayLabel(day)}
                </p>
                {hasBookings && (
                  <div className="flex items-center gap-1">
                    <span className="text-lg font-bold text-green-600">
                      {dayBookings.length}
                    </span>
                    <span className="text-xs text-gray-500">Booking</span>
                  </div>
                )}
              </div>

              {/* Bookings Content */}
              <div className="space-y-2 flex-1">
                {!hasBookings ? (
                  <div className="h-48 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-sm text-gray-400 gap-3 bg-gray-50/50">
                    <div className="relative">
                      <Box className="h-10 w-10 text-gray-300" />
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg opacity-20 blur-sm"></div>
                    </div>
                    <p className="font-medium text-gray-500">No bookings</p>
                  </div>
                ) : (
                  dayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="group rounded-xl border-2 border-gray-100 bg-gradient-to-br from-white to-gray-50/50 shadow-sm p-3 space-y-2 relative cursor-pointer hover:shadow-md hover:border-purple-200 transition-all duration-200 hover:-translate-y-0.5"
                      onClick={() => onBookingClick?.(booking)}
                    >
                      {/* Customer Name */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                            <Phone className="h-3 w-3 inline mr-1 text-gray-400" />
                            {booking.contact_name}
                          </p>
                        </div>
                      </div>

                      {/* Time Slot */}
                      {booking.service_time && (
                        <p className="text-xs font-semibold text-purple-600">
                          {booking.service_time}
                        </p>
                      )}

                      {/* Service / Summary */}
                      <p className="text-xs text-gray-600 truncate">
                        {booking.service_name}
                      </p>

                      {/* Confirmed Badge */}
                      <div className="flex items-center justify-center">
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-2 py-0.5 font-semibold border shadow-sm">
                          <span className="mr-1">✓</span>
                          Booked
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
