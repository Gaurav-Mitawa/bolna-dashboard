import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Hotel, Calendar, User, Star, Heart, Package, CheckCircle2 } from "lucide-react";
import type { PMSPersonalization } from "@/types";

// =============================================================================
// PURCHASED TAB
// Displays PMS (Property Management System) data and purchase information
// - Room details, Stay dates, Loyalty info
// - Special requests, Guest preferences
// - Purchased package info
// =============================================================================

interface PurchasedTabProps {
  pmsData: PMSPersonalization | undefined;
  purchasedPackage: string | null | undefined;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export function PurchasedTab({ pmsData, purchasedPackage }: PurchasedTabProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* ================================================================= */}
        {/* PURCHASED PACKAGE SECTION */}
        {/* ================================================================= */}
        {purchasedPackage ? (
          <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-medium mb-1">Purchased Package</p>
                <p className="text-base font-bold text-emerald-800">{purchasedPackage}</p>
                <p className="text-xs text-emerald-600 mt-1">✓ Confirmed in PMS</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-xl text-center">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No purchase recorded</p>
          </div>
        )}

        {/* ================================================================= */}
        {/* PMS DATA SECTION */}
        {/* ================================================================= */}
        {pmsData ? (
          <>
            {/* Room & Stay Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Booking Details
              </h4>
              
              {/* Room Type */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Hotel className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Room Type</p>
                  <p className="text-sm font-medium text-slate-800">{pmsData.roomType}</p>
                </div>
              </div>

              {/* Stay Dates */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Stay Duration</p>
                  <p className="text-sm font-medium text-slate-800">
                    {pmsData.checkIn} → {pmsData.checkOut}
                  </p>
                </div>
              </div>

              {/* Previous Stays & Loyalty */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase">Previous Stays</p>
                    <p className="text-sm font-medium text-slate-800">{pmsData.previousStays}</p>
                  </div>
                </div>

                {pmsData.loyaltyTier && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase">Loyalty Tier</p>
                      <p className="text-sm font-medium text-slate-800">{pmsData.loyaltyTier}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Special Requests */}
            {pmsData.specialRequests && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Special Requests
                </h4>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-800">{pmsData.specialRequests}</p>
                </div>
              </div>
            )}

            {/* Guest Preferences */}
            {pmsData.guestPreferences && pmsData.guestPreferences.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Guest Preferences
                  </h4>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {pmsData.guestPreferences.map((pref, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="text-xs bg-white border-slate-200 text-slate-700"
                    >
                      {pref}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* No PMS Data */
          <div className="text-center py-8">
            <Hotel className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No PMS data available</p>
            <p className="text-xs text-slate-300 mt-1">Sync from Property Management System</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

export default PurchasedTab;

