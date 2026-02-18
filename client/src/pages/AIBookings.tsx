/**
 * AI Bookings Page
 * Shows LLM-analyzed call bookings from the pipeline.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { callProcessorApi, CallBooking } from "@/api/callProcessorApi";
import {
    Phone,
    Calendar,
    Clock,
    RefreshCw,
    Loader2,
    CheckCircle2,
    XCircle,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

export default function AIBookingsPage() {
    const queryClient = useQueryClient();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Fetch bookings
    const {
        data: bookings = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["ai-bookings"],
        queryFn: callProcessorApi.getBookings,
    });

    // Process calls mutation
    const processMutation = useMutation({
        mutationFn: callProcessorApi.triggerProcessing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ai-bookings"] });
        },
    });

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Bookings</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Calls analyzed by AI where a booking was detected
                    </p>
                </div>
                <button
                    onClick={() => processMutation.mutate()}
                    disabled={processMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium rounded-lg transition-colors"
                >
                    {processMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    Process New Calls
                </button>
            </div>

            {/* Processing result toast */}
            {processMutation.isSuccess && processMutation.data && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <CheckCircle2 className="inline h-4 w-4 mr-1" />
                    Done: {processMutation.data.processed} processed,{" "}
                    {processMutation.data.failed} failed out of{" "}
                    {processMutation.data.total} new calls.
                </div>
            )}

            {processMutation.isError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    <XCircle className="inline h-4 w-4 mr-1" />
                    Error: {(processMutation.error as any)?.message || "Processing failed"}
                </div>
            )}

            {/* Loading state */}
            {isLoading && (
                <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto mb-2" />
                    <p className="text-gray-500">Loading bookings...</p>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="text-center py-12">
                    <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="text-red-600">{(error as any).message}</p>
                </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && bookings.length === 0 && (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-600 mb-1">
                        No bookings yet
                    </h3>
                    <p className="text-gray-400 text-sm">
                        Click "Process New Calls" to analyze recent calls with AI
                    </p>
                </div>
            )}

            {/* Bookings list */}
            {bookings.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Caller
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Date / Time
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Intent
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Duration
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Details
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {bookings.map((b) => (
                                <BookingRow
                                    key={b.call_id}
                                    booking={b}
                                    isExpanded={expandedId === b.call_id}
                                    onToggle={() =>
                                        setExpandedId(expandedId === b.call_id ? null : b.call_id)
                                    }
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function BookingRow({
    booking,
    isExpanded,
    onToggle,
}: {
    booking: CallBooking;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const analysis = booking.llm_analysis;
    const bookingDate = analysis.booking.date || "—";
    const bookingTime = analysis.booking.time || "—";

    return (
        <>
            <tr
                className="hover:bg-orange-50/40 cursor-pointer transition-colors"
                onClick={onToggle}
            >
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                            {booking.caller_number || "Unknown"}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-orange-400" />
                            {bookingDate}
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-orange-400" />
                            {bookingTime}
                        </span>
                    </div>
                </td>
                <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 capitalize">
                        {analysis.intent}
                    </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                    {Math.round(booking.call_duration)}s
                </td>
                <td className="px-4 py-3">
                    {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                </td>
            </tr>

            {/* Expanded details */}
            {isExpanded && (
                <tr>
                    <td colSpan={5} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                    AI Summary
                                </h4>
                                <p className="text-sm text-gray-800">{analysis.summary}</p>
                            </div>
                            {analysis.booking.raw_datetime_string && (
                                <div>
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                        Caller Said
                                    </h4>
                                    <p className="text-sm text-gray-600 italic">
                                        "{analysis.booking.raw_datetime_string}"
                                    </p>
                                </div>
                            )}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                    Transcript
                                </h4>
                                <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                                    {booking.transcript}
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
