/**
 * Settings Page
 * Account settings, Bolna API key management, and subscription info
 * Uses backend /api/settings endpoints (PUT /bolna-api for key update)
 */

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Key,
  Check,
  RefreshCw,
  Shield,
  CalendarDays,
  Save,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SettingsData {
  name: string;
  email: string;
  profileImage: string;
  maskedKey: string | null;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  trialExpiresAt: string | null;
  trialStartedAt: string | null;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  isTrial: boolean;
}

async function fetchSettings(): Promise<SettingsData> {
  const res = await fetch("/api/settings", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export default function SettingsPage() {
  const { user, refetchUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<SettingsData>({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  // API key update state
  const [newApiKey, setNewApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateApiKey = async () => {
    if (!newApiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/bolna-api", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bolnaApiKey: newApiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update API key");
        return;
      }

      toast.success("Bolna API key updated successfully");
      setNewApiKey("");
      setShowKeyInput(false);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      refetchUser();
    } catch (err) {
      toast.error("Network error while updating API key");
    } finally {
      setIsSaving(false);
    }
  };

  const subscriptionStatusBadge = () => {
    const status = settings?.subscriptionStatus || user?.subscriptionStatus || "inactive";
    const map: Record<string, { label: string; className: string }> = {
      active: { label: "Active", className: "bg-green-100 text-green-700 border-green-200" },
      trial: { label: "Trial", className: "bg-blue-100 text-blue-700 border-blue-200" },
      expired: { label: "Expired", className: "bg-red-100 text-red-700 border-red-200" },
      inactive: { label: "Inactive", className: "bg-gray-100 text-gray-700 border-gray-200" },
    };
    const s = map[status] || map.inactive;
    return (
      <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", s.className)}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-xs sm:text-sm text-gray-500">Manage your account and configuration</p>
        </div>
        <Button
          onClick={() => {
            refetchUser();
            queryClient.invalidateQueries({ queryKey: ["settings"] });
          }}
          variant="outline"
          size="sm"
          className="h-9 sm:h-10 text-xs sm:text-sm w-full sm:w-auto"
        >
          <RefreshCw className="h-4 w-4 mr-1.5 sm:mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Account Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your account details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Name</p>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Email</p>
              <p className="text-base sm:text-lg font-medium text-gray-900">{user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Account ID</p>
              <p className="text-xs sm:text-sm font-mono bg-gray-100 p-2 rounded break-all">{user?.id || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Subscription</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {settings?.isTrial
                  ? "7-Day Free Trial — ClusterX CRM"
                  : "Your current subscription status"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Status</p>
              <div className="mt-1">{subscriptionStatusBadge()}</div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Expires</p>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-700">
                  {settings?.subscriptionExpiresAt
                    ? new Date(settings.subscriptionExpiresAt).toLocaleDateString()
                    : settings?.trialExpiresAt
                      ? new Date(settings.trialExpiresAt).toLocaleDateString()
                      : "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Days Remaining</p>
              <p className={cn(
                "text-sm font-semibold",
                settings?.daysRemaining && settings.daysRemaining <= 3
                  ? "text-red-600"
                  : settings?.daysRemaining && settings.daysRemaining <= 7
                    ? "text-yellow-600"
                    : "text-gray-900"
              )}>
                {(settings?.subscriptionStatus === "active" || settings?.subscriptionStatus === "trial")
                  ? `${settings?.daysRemaining ?? 0} days`
                  : "—"}
              </p>
            </div>
            <div className="flex items-end">
              {!(settings?.isSubscriptionActive ?? user?.isSubscriptionActive) && (
                <Button
                  size="sm"
                  onClick={() => (window.location.href = "/subscribe")}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  {settings?.subscriptionStatus === "expired" ? "Renew" : "Subscribe Now"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Configuration */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">Bolna API Key</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Your encrypted Bolna API key — stored securely on the server
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-4">
          {/* Current key display */}
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Current Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 p-2.5 sm:p-3 rounded-lg font-mono text-xs sm:text-sm break-all">
                {isLoading
                  ? "Loading..."
                  : settings?.maskedKey || "Not configured"}
              </code>
              {settings?.maskedKey && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3.5 w-3.5" /> Validated
                </span>
              )}
            </div>
          </div>

          {/* Update key */}
          {!showKeyInput ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeyInput(true)}
              className="w-full sm:w-auto"
            >
              <Key className="h-4 w-4 mr-2" />
              {settings?.maskedKey ? "Update API Key" : "Set API Key"}
            </Button>
          ) : (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700">Enter new Bolna API key</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="password"
                  placeholder="bn-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleUpdateApiKey}
                    disabled={isSaving || !newApiKey.trim()}
                    className="flex-1 sm:flex-initial"
                  >
                    {isSaving ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowKeyInput(false);
                      setNewApiKey("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                The key will be validated against Bolna API before saving. It's encrypted with AES-256 before storage.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
