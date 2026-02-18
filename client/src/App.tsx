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

/**
 * Main App Content
 * Handles authentication state and routing
 */
function AppContent() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const [location] = useLocation();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to Bolna...</p>
        </div>
      </div>
    );
  }

  // Show error if API key is not configured or invalid
  if (error || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration Required</h1>
            <p className="text-gray-600 mb-4">
              {error || 'Unable to connect to Bolna API'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">Setup Instructions:</h2>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>Get your API key from <a href="https://platform.bolna.ai/developers" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.bolna.ai/developers</a></li>
              <li>Open <code className="bg-gray-200 px-1 rounded">client/.env.development</code></li>
              <li>Replace <code className="bg-gray-200 px-1 rounded">your-bolna-api-key-here</code> with your actual API key</li>
              <li>Restart the development server</li>
            </ol>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Example .env file:</strong>
            </p>
            <pre className="text-xs bg-blue-100 p-2 rounded mt-2 overflow-x-auto">
              VITE_BOLNA_API_KEY=bn_xxxxxxxxxxxxxxxx
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Redirect root to dashboard
  if (location === "/") {
    return <Redirect to="/dashboard" />;
  }

  // All authenticated pages use AppShell layout
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
