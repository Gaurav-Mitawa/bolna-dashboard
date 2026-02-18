/**
 * Booking Management Page
 * Displays LLM-processed call bookings in Calendar and List views
 * Calendar: Only "booked" calls | List: Both "booked" and "queries" calls
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarView } from "@/components/bookings/CalendarView";
import { ListView } from "@/components/bookings/ListView";
import { BookingDetailModal } from "@/components/bookings/BookingDetailModal";
import { getBookings, getBookedCalls, type Booking } from "@/api/bookings";
import {
  Calendar,
  List,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, addMonths, subMonths } from "date-fns";

type ViewMode = "calendar" | "list";

interface WeekData {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  dateRange: string;
}

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Fetch ALL bookings (booked + queries) for the list view
  const { data: allBookings = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["bookings-all"],
    queryFn: () => getBookings(),
    refetchInterval: 60_000, // Auto-refresh every minute
  });

  // Fetch only booked calls for calendar view
  const { data: bookedCalls = [], isLoading: isLoadingBooked } = useQuery({
    queryKey: ["bookings-booked"],
    queryFn: () => getBookedCalls(),
    refetchInterval: 60_000,
  });

  const isLoading = isLoadingAll || isLoadingBooked;

  // Calculate weeks for the current month
  const weeks = useMemo<WeekData[]>(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);

    const weekStarts = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }
    );

    return weekStarts.map((weekStart, index) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      return {
        weekNumber: index + 1,
        startDate: weekStart,
        endDate: weekEnd,
        dateRange: `${format(weekStart, "dd MMM")} - ${format(weekEnd, "dd MMM yyyy")}`,
      };
    });
  }, [currentDate]);

  // Filter bookings based on search query
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return allBookings;

    const query = searchQuery.toLowerCase();
    return allBookings.filter((booking) =>
      booking.contact_name?.toLowerCase().includes(query) ||
      booking.service_name.toLowerCase().includes(query) ||
      booking.status.toLowerCase().includes(query) ||
      booking.caller_number?.toLowerCase().includes(query)
    );
  }, [allBookings, searchQuery]);

  // Filter booked calls for calendar based on search
  const filteredBooked = useMemo(() => {
    if (!searchQuery.trim()) return bookedCalls;

    const query = searchQuery.toLowerCase();
    return bookedCalls.filter((booking) =>
      booking.contact_name?.toLowerCase().includes(query) ||
      booking.service_name.toLowerCase().includes(query) ||
      booking.caller_number?.toLowerCase().includes(query)
    );
  }, [bookedCalls, searchQuery]);

  // Group booked calls by week for calendar view
  const bookingsByWeek = useMemo(() => {
    const grouped = new Map<number, Booking[]>();

    weeks.forEach((week) => {
      const weekBookings = filteredBooked.filter((booking) => {
        if (!booking.service_date) return false;
        const bookingDate = new Date(booking.service_date);
        return bookingDate >= week.startDate && bookingDate <= week.endDate;
      });
      grouped.set(week.weekNumber, weekBookings);
    });

    return grouped;
  }, [filteredBooked, weeks]);

  // Count today's bookings
  const todayBookings = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return bookedCalls.filter((b) => b.service_date === today).length;
  }, [bookedCalls]);

  // Navigation handlers
  const goToPreviousMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const goToNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthDisplay = format(currentDate, "MMMM yyyy");
  const todayDisplay = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Booking Management</h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Auto-populated from AI-processed calls</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              className={`h-8 sm:h-9 text-xs sm:text-sm ${viewMode === "calendar" ? "bg-white shadow-sm" : ""}`}
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              <span className="hidden sm:inline">Calendar</span>
              <span className="sm:hidden">Cal</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 sm:h-9 text-xs sm:text-sm ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
            >
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              List
            </Button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:flex-none min-w-[140px] sm:min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64 h-9 sm:h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{monthDisplay}</h2>
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 flex-wrap">
            <span className="hidden sm:inline">Today: {todayDisplay}</span>
            <span className="sm:hidden">{format(new Date(), "MMM d")}</span>
            <span className="hidden sm:inline mx-2">•</span>
            <span className={todayBookings > 0 ? "text-orange-500 font-semibold" : "text-gray-400"}>
              {todayBookings} today
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 sm:h-9 text-xs sm:text-sm">
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextMonth} className="h-8 w-8 sm:h-9 sm:w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-2 text-gray-600 text-sm">Loading bookings...</span>
        </div>
      )}

      {/* Calendar View — Only booked calls */}
      {!isLoading && viewMode === "calendar" && (
        <div className="space-y-4 sm:space-y-6">
          {weeks.map((week) => (
            <CalendarView
              key={week.weekNumber}
              weekNumber={week.weekNumber}
              dateRange={week.dateRange}
              startDate={week.startDate}
              endDate={week.endDate}
              bookings={bookingsByWeek.get(week.weekNumber) || []}
              onBookingClick={(booking) => setSelectedBooking(booking)}
            />
          ))}
        </div>
      )}

      {/* List View — Booked + Queries calls */}
      {!isLoading && viewMode === "list" && (
        <ListView
          bookings={filteredBookings}
          onBookingClick={(booking) => setSelectedBooking(booking)}
        />
      )}

      {/* Empty State */}
      {!isLoading && (viewMode === "calendar" ? filteredBooked : filteredBookings).length === 0 && (
        <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200 px-4">
          <CalendarDays className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-1 sm:mb-2">No bookings found</h3>
          <p className="text-gray-400 text-xs sm:text-sm">
            {searchQuery
              ? "No bookings match your search criteria"
              : "Bookings will appear here automatically when calls are processed by the AI pipeline"}
          </p>
        </div>
      )}

      {/* Booking Detail Modal */}
      <BookingDetailModal
        booking={selectedBooking}
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      />
    </div>
  );
}
