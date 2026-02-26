import { useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
} from "date-fns";
import { ArrowUpRight } from "lucide-react";
import type { Booking } from "@/api/bookings";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  currentDate: Date;
  bookings: Booking[];
  onBookingClick?: (booking: Booking) => void;
}

const intentColors: Record<string, { dot: string; bg: string; text: string; border: string; glow: string }> = {
  booked: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200/60",
    glow: "shadow-emerald-100",
  },
  interested: {
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200/60",
    glow: "shadow-blue-100",
  },
};

const getIntentColor = (intent: string) =>
  intentColors[intent] || intentColors.interested;

export function CalendarView({
  currentDate,
  bookings,
  onBookingClick,
}: CalendarViewProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  const daysInGrid = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => b.service_date && isSameDay(new Date(b.service_date), day));

  const totalThisMonth = useMemo(
    () =>
      bookings.filter(
        (b) => b.service_date && isSameMonth(new Date(b.service_date), currentDate)
      ).length,
    [bookings, currentDate]
  );

  return (
    <div className="w-full">

      {/* Calendar Scroll Wrapper */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[500px]">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-semibold uppercase tracking-widest text-gray-400 py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            {daysInGrid.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const dayBookings = getBookingsForDay(day);
              const dayKey = format(day, "yyyy-MM-dd");
              const isHovered = hoveredDay === dayKey;
              const pastDay = isPast(day) && !isCurrentDay;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredDay(dayKey)}
                  onMouseLeave={() => setHoveredDay(null)}
                  className={cn(
                    "relative min-h-[120px] sm:min-h-[130px] p-2 flex flex-col border-b border-r border-gray-100/80 transition-all duration-200",
                    isCurrentMonth ? "bg-white" : "bg-gray-50/50",
                    isHovered && isCurrentMonth && "bg-orange-50/30",
                    !isCurrentMonth && "opacity-40"
                  )}
                >
                  {/* Date badge */}
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex gap-0.5 pt-1">
                      {dayBookings.length > 0 && isCurrentMonth && (
                        <>
                          {dayBookings.slice(0, 3).map((b, i) => (
                            <div
                              key={i}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                getIntentColor(b.intent_category).dot
                              )}
                            />
                          ))}
                        </>
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-xs font-medium h-7 w-7 flex items-center justify-center rounded-full transition-all",
                        isCurrentDay
                          ? "bg-orange-500 text-white font-bold shadow-lg shadow-orange-200"
                          : pastDay && isCurrentMonth
                            ? "text-gray-400"
                            : "text-gray-700",
                        isHovered && !isCurrentDay && "bg-gray-100"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {dayBookings.slice(0, 2).map((booking) => {
                      const colors = getIntentColor(booking.intent_category);
                      return (
                        <button
                          key={booking.id}
                          onClick={() => onBookingClick?.(booking)}
                          className={cn(
                            "w-full text-left rounded-md px-2 py-1 flex items-center gap-1.5 border transition-all duration-150 group",
                            colors.bg,
                            colors.border,
                            "hover:shadow-md",
                            colors.glow
                          )}
                        >
                          <div
                            className={cn(
                              "w-[3px] h-3 rounded-full shrink-0",
                              colors.dot
                            )}
                          />
                          <span
                            className={cn(
                              "text-[10px] font-semibold truncate leading-tight",
                              colors.text
                            )}
                          >
                            {booking.service_time && (
                              <span className="opacity-70">{booking.service_time.split(" ")[0]} </span>
                            )}
                            {booking.contact_name || "Unknown"}
                          </span>
                          <ArrowUpRight
                            className={cn(
                              "w-2.5 h-2.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity",
                              colors.text
                            )}
                          />
                        </button>
                      );
                    })}

                    {dayBookings.length > 2 && (
                      <span className="text-[10px] font-medium text-gray-400 pl-1">
                        +{dayBookings.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom stats strip */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Interested
          </span>
        </div>
        <div className="text-xs text-gray-400">
          {totalThisMonth} booking{totalThisMonth !== 1 ? "s" : ""} this month
        </div>
      </div>

    </div>
  );
}
