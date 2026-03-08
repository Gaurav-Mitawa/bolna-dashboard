/**
 * Subscribe Page — Razorpay ₹3,499/month Growth Plan subscription checkout
 */
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { IndianRupee, CheckCircle2, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscribePage() {
  const { user, refetchUser } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  const BASE_PRICE = 3499;

  const startPayment = async () => {
    setProcessing(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) {
        toast.error("Failed to load payment gateway. Check your network.");
        setProcessing(false);
        return;
      }

      const orderRes = await fetch("/api/subscribe/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        toast.error(orderData.error || "Failed to create order");
        setProcessing(false);
        return;
      }

      const configRes = await fetch("/api/subscribe/config", { credentials: "include" });
      const config = await configRes.json();

      const options = {
        key: config.razorpayKeyId,
        amount: orderData.amount,
        currency: "INR",
        name: "ClusterX CRM",
        description: "Growth Plan — ₹3,499 / month",
        order_id: orderData.orderId,
        prefill: { name: orderData.userName, email: orderData.userEmail },
        theme: { color: "#2563EB" },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/subscribe/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              toast.success("Subscription activated!");
              await refetchUser();
              window.location.href = "/dashboard";
            } else {
              toast.error(verifyData.error || "Verification failed");
            }
          } catch {
            toast.error("Payment verification error");
          }
        },
        modal: { ondismiss: () => setProcessing(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setProcessing(false);
    }
  };

  const isSubscribed = user?.subscriptionStatus === "active";

  const formattedExpiry = user?.subscriptionExpiresAt
    ? new Date(user.subscriptionExpiresAt).toLocaleDateString("en-IN", {
      year: 'numeric', month: 'long', day: 'numeric'
    })
    : "N/A";

  return (
    <div className={cn(
      "flex items-center justify-center p-4",
      user?.isSubscriptionActive ? "w-full py-8" : "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
    )}>
      <div className="w-full max-w-md">
        {!isSubscribed && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white mb-4">
              <IndianRupee className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ClusterX CRM</h1>
            <p className="text-gray-600 mt-2">Business-ready AI CRM — Growth Plan</p>
          </div>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">
              {isSubscribed ? "Current Subscription" : user?.subscriptionStatus === "expired" ? "Renew Subscription" : "Growth Plan"}
            </CardTitle>
            <CardDescription>
              {isSubscribed
                ? "You have full access to CRM, campaigns, and more."
                : user?.subscriptionStatus === "expired" && user?.trialStartedAt
                  ? "Your 7-day free trial has ended. Subscribe to continue using ClusterX CRM."
                  : user?.subscriptionStatus === "expired"
                    ? "Your subscription has expired. Renew to continue."
                    : "Get full access to CRM, campaigns, and more."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSubscribed && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Plan</span>
                  <span className="text-sm font-semibold text-gray-900">Growth Plan</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-500">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    Active
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Expires On</span>
                  <span className="text-sm font-semibold text-gray-900">{formattedExpiry}</span>
                </div>
              </div>
            )}
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold text-blue-700">
                  ₹{Number(BASE_PRICE).toLocaleString()}
                </span>
                <span className="text-gray-500 mt-2">/month</span>
              </div>
            </div>

            <div className="space-y-3">
              {[
                "Inbound & Outbound call monitoring",
                "AI Agent Control Panel",
                "AI Agent Campaigns",
                "Personalised Calls",
                "Call Recordings",
                "Unlimited CRM",
                "Lead Pipeline Management",
                "Booking System",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>



            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <CalendarDays className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Valid for 30 days. Renewals extend your existing expiry date.
              </p>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
              onClick={startPayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <IndianRupee className="h-5 w-5 mr-1" />
                  {isSubscribed ? `Renew for ₹${Number(BASE_PRICE).toLocaleString()}` : `Pay ₹${Number(BASE_PRICE).toLocaleString()}`}
                </>
              )}
            </Button>

            {/* Free Trial — only if API key is set and never used a trial */}
            {user?.bolnaKeySet && !user?.trialStartedAt && !isSubscribed && (
              <div className="pt-4 border-t border-gray-100">
                {/* Coupon Code Section */}
                <div className="mb-4">
                  {!showCouponInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCouponInput(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                    >
                      Have a coupon code?
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Coupon Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError("");
                          }}
                          placeholder="Enter code"
                          className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                            couponError
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:ring-blue-500"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCouponInput(false);
                            setCouponCode("");
                            setCouponError("");
                          }}
                          className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-red-600 text-sm">{couponError}</p>
                      )}
                      {couponCode && !couponError && (
                        <p className="text-green-600 text-sm">
                          ✓ Code will be applied on trial start
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="outline"
                  className="w-full h-11 text-base font-semibold border-green-400 text-green-700 hover:bg-green-50"
                  onClick={async () => {
                    try {
                      setProcessing(true);
                      setCouponError("");

                      const res = await fetch("/api/subscribe/start-trial", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          couponCode: couponCode.trim() || undefined,
                        }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        // Handle coupon-specific errors
                        if (data.field === "couponCode") {
                          setCouponError(data.message);
                          setProcessing(false);
                          return;
                        }
                        toast.error(data.message || data.error || "Could not start trial");
                        setProcessing(false);
                        return;
                      }

                      // Show success message
                      if (data.couponApplied) {
                        toast.success("30-day trial started with coupon code!");
                      } else {
                        toast.success("7-day free trial activated!");
                      }

                      await refetchUser();
                      window.location.href = "/dashboard";
                    } catch {
                      toast.error("Network error. Please try again.");
                    } finally {
                      setProcessing(false);
                    }
                  }}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Starting Trial...
                    </>
                  ) : (
                    `Start ${couponCode.trim() ? "30" : "7"}-Day Free Trial`
                  )}
                </Button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  No credit card required. Full access for {couponCode.trim() ? "30" : "7"} days.
                </p>
              </div>
            )}


          </CardContent>
        </Card>

        {!isSubscribed && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Signed in as <strong>{user?.email}</strong> ·{" "}
            <a href="/api/auth/logout" className="text-blue-600 hover:underline">
              Sign out
            </a>
          </p>
        )}
      </div>
    </div >
  );
}
