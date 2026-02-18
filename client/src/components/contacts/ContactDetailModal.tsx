/**
 * Contact Detail Modal Component (Simplified 2-Tab Version)
 * History and Action tabs only
 * Matches the design shown in the reference images
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  Clock,
  MessageSquare,
  ShoppingCart,
  Calendar,
  Star,
  Hotel,
  Users,
  Heart,
  MapPin,
  FileText,
  Zap,
  Loader2,
} from "lucide-react";
import { getContactDetails } from "@/api/contacts";
import type { ContactDetails, CallHistoryItem, BookingData } from "@/types";
import type { Contact } from "@/api/bolnaContacts";

interface ContactDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function ContactDetailModal({
  contact,
  open,
  onOpenChange,
  onEdit
}: ContactDetailModalProps) {
  const [activeTab, setActiveTab] = useState("history");

  // Fetch contact details
  const { data: contactDetails, isLoading: isLoadingDetails } = useQuery<ContactDetails>({
    queryKey: ['contact-details', contact?.id],
    queryFn: () => getContactDetails(contact!.id),
    enabled: !!contact?.id && open,
    staleTime: 30000,
  });

  // Early return AFTER all hooks are called
  if (!contact) return null;

  // Use real data from API
  const callHistory: CallHistoryItem[] = contactDetails?.call_history || [];
  const bookingData: BookingData | null = contactDetails?.booking_data || null;

  // Show loading state
  if (isLoadingDetails) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
            <p className="text-gray-600">Loading contact details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Compact Orange Header */}
        <div className="bg-orange-500 text-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Users className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{contact.name}</h2>
              <div className="flex items-center gap-4 mt-1.5 text-sm text-white/90">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{contact.phone || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{contact.email || "N/A"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="capitalize">{contact.tag || "No Status"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation - 2 Tabs Only */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <div className="border-b bg-gray-50/50 px-6">
            <TabsList className="w-full justify-start h-11 bg-transparent rounded-none p-0">
              <TabsTrigger
                value="history"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-t-lg rounded-b-none gap-2 px-4"
              >
                <FileText className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger
                value="action"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-orange-500 rounded-t-lg rounded-b-none gap-2 px-4"
              >
                <Zap className="h-4 w-4" />
                Action
              </TabsTrigger>
            </TabsList>
          </div>

          {/* History Tab Content */}
          <TabsContent value="history" className="p-6 m-0 max-h-[500px] overflow-y-auto">
            <div className="space-y-3">
              {callHistory.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-1">No History Yet</p>
                  <p className="text-sm text-gray-400">
                    Interaction history will appear here
                  </p>
                </div>
              ) : (
                callHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all hover:border-orange-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {item.type === 'CALL' ? (
                          <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Phone className="h-5 w-5 text-blue-600" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm text-gray-900">
                              {item.type}
                            </span>
                            {item.duration && (
                              <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                                <Clock className="h-3.5 w-3.5" />
                                {item.duration}
                              </span>
                            )}
                            {item.agent && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs border-orange-200 px-2.5 py-0.5">
                                {item.agent}
                              </Badge>
                            )}
                            {item.sentiment && (
                              <Badge className="bg-green-100 text-green-700 text-xs border-green-200 px-2.5 py-0.5">
                                {item.sentiment}
                              </Badge>
                            )}
                            {item.outcome && (
                              <Badge className="bg-teal-100 text-teal-700 text-xs border-teal-200 px-2.5 py-0.5">
                                {item.outcome}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed mt-2">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Action Tab Content (Previously Purchase Tab) */}
          <TabsContent value="action" className="p-6 m-0 max-h-[500px] overflow-y-auto">
            {bookingData && bookingData.has_booking ? (
              <div className="space-y-4">
                {/* Purchased Package Card */}
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-teal-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                      <ShoppingCart className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-teal-600 font-semibold mb-1 uppercase tracking-wide">
                        Purchased Package
                      </p>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {bookingData.package || 'Standard Package'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-teal-700 font-semibold">
                          {bookingData.status || 'Confirmed in PMS'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Details Grid */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                    Booking Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <Hotel className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Room Type</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {bookingData.room_type || 'Standard Room'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <Calendar className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Stay Duration</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {bookingData.check_in || 'N/A'} {bookingData.check_out ? `— ${bookingData.check_out}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <Users className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Previous Stays</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {bookingData.previous_stays || 0}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <Star className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Loyalty Tier</p>
                        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                          <span className="text-yellow-600">★</span>
                          {bookingData.loyalty_tier || 'Bronze'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Special Requests */}
                {bookingData.special_requests && (
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Special Requests
                    </h4>
                    <div className="bg-white/80 border border-amber-200 rounded-lg p-4">
                      <p className="text-sm text-amber-900">
                        {bookingData.special_requests}
                      </p>
                    </div>
                  </div>
                )}

                {/* Guest Preferences */}
                {bookingData.preferences && bookingData.preferences.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Heart className="h-4 w-4 text-pink-500" />
                      Guest Preferences
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {bookingData.preferences.map((pref, idx) => (
                        <span
                          key={idx}
                          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-200 font-medium"
                        >
                          {pref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <ShoppingCart className="h-14 w-14 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-1">No Purchase Yet</p>
                <p className="text-sm text-gray-400">
                  This contact hasn't made any bookings
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Last updated: {new Date((contact as any).updated_at || contact.created_at || Date.now()).toLocaleString()}
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="px-6 border-gray-300"
            >
              Close
            </Button>
            {onEdit && (
              <Button
                onClick={onEdit}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6"
              >
                Edit Contact
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ContactDetailModal;
