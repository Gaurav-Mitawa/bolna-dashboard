# Subscription Tab & Details Implementation

We need to add a "Subscription" tab in the sidebar that allows users to view their active subscription, its expiry date, and a "Renew" button linked to Razorpay.

## Proposed Changes

### Frontend - Layout & Routing
#### [MODIFY] [client/src/components/layout/AppShell.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/components/layout/AppShell.tsx)
- Import `CreditCard` from `lucide-react`.
- Add a new item to `navItems`: `{ label: "Subscription", href: "/subscription", icon: CreditCard }`.
- Update the layout so this tab appears in the left sidebar.

#### [MODIFY] [client/src/App.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/App.tsx)
- Add a proper route for `/subscription` inside the `<AppShell>` switch statement: `<Route path="/subscription" component={SubscribePage} />`.
- This ensures that when a user is actively subscribed, they can navigate to this page within the dashboard layout.

### Frontend - Subscription UI
#### [MODIFY] [client/src/pages/Subscribe.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/pages/Subscribe.tsx)
- Restructure the UI slightly so it serves as both the "forced full-screen checkout" (when expired) and the "in-dashboard subscription management page" (when active).
- Add a section at the top of the card showing **Current Plan: Anti-Gravity CRM**.
- Show **Status** (Active/Expired) using `user.subscriptionStatus`.
- Show **Expires On** using `user.subscriptionExpiresAt` (formatted nicely).
- Keep the existing Razorpay logic exactly as it is for the "Renew Subscription" button.
- Clean up the layout container so it looks good when rendered inside the [AppShell](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/components/layout/AppShell.tsx#75-261).

## Verification Plan

### Manual Verification
1. Open the dashboard in the browser and verify the "Subscription" tab exists in the sidebar.
2. Click the tab and verify the page loads inside the main layout.
3. Verify that the current plan, active status, and expiry date are prominently displayed.
4. Verify the "Renew Subscription" button still triggers the Razorpay flow correctly.
5. Verify the "Skip Payment (Developer Bypass)" button still works.
