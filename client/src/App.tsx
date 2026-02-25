import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import DashboardPage from "@/pages/Dashboard";
import CustomersPage from "@/pages/customers";
import CampaignsPage from "@/pages/campaigns";
import VoiceAgentPage from "@/pages/agents/voice";
import CallHistoryPage from "@/pages/CallHistory";
import BillingPage from "@/pages/Billing";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import BookingsPage from "@/pages/Bookings";
import LoginPage from "@/pages/Login";
import SubscribePage from "@/pages/Subscribe";
import SetupApiPage from "@/pages/SetupApi";

/**
 * Main App Content
 * Handles authentication state and routing
 */
function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Public routes — accessible without authentication
  if (location === "/login" || location.startsWith("/login")) {
    if (isAuthenticated) return <Redirect to="/dashboard" />;
    return <LoginPage />;
  }

  // Not authenticated → send to login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated but no Bolna key → setup-api
  if (location === "/setup-api") {
    return <SetupApiPage />;
  }
  if (!user?.bolnaKeySet) {
    return <SetupApiPage />;
  }

  // Authenticated + has key but no active subscription → subscribe
  if (location === "/subscribe" || location === "/subscription") {
    if (!user?.isSubscriptionActive) return <SubscribePage />;
  }
  if (!user?.isSubscriptionActive) {
    return <SubscribePage />;
  }

  // Redirect root to dashboard
  if (location === "/") {
    return <Redirect to="/dashboard" />;
  }

  // All authenticated + subscribed pages use AppShell layout
  return (
    <AppShell>
      <Switch>
        <Route path="/dashboard" component={DashboardPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/campaigns" component={CampaignsPage} />
        <Route path="/agents/voice" component={VoiceAgentPage} />
        <Route path="/call-history" component={CallHistoryPage} />
        <Route path="/bookings" component={BookingsPage} />
        <Route path="/billing" component={BillingPage} />
        <Route path="/subscription" component={SubscribePage} />
        <Route path="/settings" component={SettingsPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

/**
 * App Component
 * Root component with providers
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppContent />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
