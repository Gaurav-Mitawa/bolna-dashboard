/**
 * Billing Page
 * Shows subscription status + Bolna wallet balance
 * Data sourced exclusively from /user/me API
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { userApi } from "@/lib/bolnaApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  CalendarDays,
  Activity,
  Clock,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface SubscriptionInfo {
  subscription: {
    status: string;
    expiresAt: string | null;
    trialExpiresAt: string | null;
    daysLeft: number;
    isTrial: boolean;
  };
  lastPayment: {
    amountPaid: number;
    periodStart: string | null;
    periodEnd: string | null;
    paidAt: string;
  } | null;
}

export default function BillingPage() {
  const { refetchUser } = useAuth();

  // Fetch subscription details from our backend
  const { data: subData } = useQuery<SubscriptionInfo>({
    queryKey: ["subscription-info"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  // Fetch Bolna user data (wallet + concurrency) from /user/me
  const {
    data: bolnaUser,
    isLoading,
    refetch: refetchBolna,
  } = useQuery({
    queryKey: ["bolna-user-me"],
    queryFn: () => userApi.getMe(),
    staleTime: 30_000,
  });

  const walletBalance = bolnaUser?.wallet || 0;
  const concurrencyCurrent = bolnaUser?.concurrency?.current || 0;

  // ─── Subscription Expiry Toast ────────────────────────────────────
  const toastShownRef = useRef(false);
  useEffect(() => {
    if (!subData?.subscription || toastShownRef.current) return;
    const { status, daysLeft } = subData.subscription;
    toastShownRef.current = true;

    if (status === "expired") {
      toast.error("Your subscription has expired. Please renew to continue using the platform.", {
        duration: 8000,
      });
    } else if (status === "active" && daysLeft <= 3) {
      toast.warning(`Your subscription expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Renew now to avoid interruption.`, {
        duration: 6000,
      });
    } else if (status === "active" && daysLeft <= 7) {
      toast.info(`Heads up — your subscription expires in ${daysLeft} days.`, {
        duration: 5000,
      });
    }
  }, [subData]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const sub = subData?.subscription;
  const subStatusConfig = {
    active: { label: "Active", icon: CheckCircle, className: "text-green-600", bg: "bg-green-50 border-green-200" },
    trial: { label: "Trial", icon: Clock, className: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    inactive: { label: "Inactive", icon: XCircle, className: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
    expired: { label: "Expired", icon: AlertTriangle, className: "text-red-600", bg: "bg-red-50 border-red-200" },
  };
  const subSC = subStatusConfig[sub?.status as keyof typeof subStatusConfig] || subStatusConfig.inactive;

  const handleRefresh = () => {
    refetchUser();
    refetchBolna();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Billing & Usage</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Subscription status and Bolna wallet usage
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
          className="h-9 sm:h-10 text-xs sm:text-sm"
        >
          <RefreshCw className={`h-4 w-4 mr-1.5 sm:mr-2 ${isLoading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Subscription Status Card */}
      <Card className={cn("border-2", sub ? subSC.bg : "bg-gray-50 border-gray-200")}>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  sub?.status === "active" ? "bg-green-100" : "bg-red-100"
                )}
              >
                <CalendarDays
                  className={cn(
                    "h-5 w-5",
                    sub?.status === "active" ? "text-green-600" : "text-red-600"
                  )}
                />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Subscription</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {sub?.isTrial
                    ? "7-Day Free Trial — ClusterX CRM"
                    : "Cluster X CRM — ₹3,499 / month"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                className={cn(
                  "text-sm px-3 py-1 font-semibold",
                  sub?.status === "active"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : sub?.status === "trial"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-red-100 text-red-700 border-red-200"
                )}
              >
                {subSC.label}
              </Badge>
              {sub?.status !== "active" && (
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => (window.location.href = "/subscription")}
                >
                  Subscribe Now
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <div className="flex items-center gap-2">
                <subSC.icon className={cn("h-4 w-4", subSC.className)} />
                <span className={cn("text-sm font-semibold", subSC.className)}>
                  {subSC.label}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Expires</p>
              <p className="text-sm font-medium text-gray-900">
                {sub?.expiresAt
                  ? formatDate(sub.expiresAt)
                  : sub?.trialExpiresAt
                    ? formatDate(sub.trialExpiresAt)
                    : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
              <p className="text-sm font-medium text-gray-900">
                {(sub?.status === "active" || sub?.status === "trial") ? (
                  <span
                    className={cn(
                      sub.daysLeft <= 7 ? "text-yellow-600 font-bold" : "text-gray-900"
                    )}
                  >
                    {sub.daysLeft} days
                  </span>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
          {sub?.status === "active" && sub.daysLeft <= 7 && (
            <div className="mt-3 pt-3 border-t border-yellow-200 flex items-center justify-between">
              <p className="text-sm text-yellow-700">
                Subscription expiring soon — renew to avoid interruption
              </p>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                onClick={() => (window.location.href = "/subscribe")}
              >
                Renew
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Payment Card */}
      {subData?.lastPayment && (
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Last Payment</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Paid on {formatDate(subData.lastPayment.paidAt)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-2 sm:pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount Paid</p>
                <p className="text-xl font-bold text-gray-900">
                  ₹{subData.lastPayment.amountPaid.toLocaleString("en-IN")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Period</p>
                <p className="text-sm text-gray-700">
                  {formatDate(subData.lastPayment.periodStart)} — {formatDate(subData.lastPayment.periodEnd)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bolna Wallet */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Bolna Wallet</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage your call credits
                </CardDescription>
              </div>
            </div>

          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-4">
          {/* Wallet Balance */}
          <div>
            <p className="text-xs sm:text-sm text-gray-500 mb-1">Current Balance</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              ₹{walletBalance.toFixed(2)}
            </p>
          </div>

          {/* Active Concurrent Calls */}
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Calls</p>
                <p className="text-lg font-bold text-gray-900">{concurrencyCurrent}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
