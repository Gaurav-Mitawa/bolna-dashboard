/**
 * Settings Page
 * Account settings and Bolna configuration
 * Fully responsive for all device sizes
 */

import { useAuth } from "@/contexts/AuthContext";
import { getBolnaApiKey } from "@/lib/bolnaApi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  Key,
  Copy,
  Check,
  RefreshCw,
  Wallet
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, refetchUser } = useAuth();
  const [copied, setCopied] = useState(false);

  const apiKey = getBolnaApiKey();
  const maskedApiKey = apiKey
    ? `${apiKey.slice(0, 8)}${'•'.repeat(20)}${apiKey.slice(-4)}`
    : 'Not configured';

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-xs sm:text-sm text-gray-500">Manage your account and configuration</p>
        </div>
        <Button
          onClick={() => refetchUser()}
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
              <CardDescription className="text-xs sm:text-sm">Your Bolna account details</CardDescription>
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
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Wallet Balance</p>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-500" />
                <p className="text-lg sm:text-xl font-semibold text-green-600">₹{user?.wallet?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Info */}
      <Card>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Key className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">API Configuration</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your Bolna API key configuration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-2 sm:pt-4 space-y-4 sm:space-y-6">
          <div>
            <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Current API Key</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <code className="flex-1 bg-gray-100 p-2.5 sm:p-3 rounded-lg font-mono text-xs sm:text-sm break-all">
                {maskedApiKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyApiKey}
                disabled={!apiKey}
                className="h-10 sm:h-11 w-full sm:w-auto"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span className="ml-2 sm:hidden">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
