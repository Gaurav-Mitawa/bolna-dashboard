# Phase 2 — Subscription & Billing Fixes Walkthrough

## Changes Made

### 1. New File: [plans.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/config/plans.ts)
Single source of truth for subscription plans — trial (7 days, free) and Growth Plan (₹3,499/month). All other files import from here.

### 2. Model: [User.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/models/User.ts)
Added `"trial"` to `subscriptionStatus` enum in both TypeScript interface and Mongoose schema.

### 3. Middleware: [auth.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/middleware/auth.ts)
[isSubscribed](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/middleware/auth.ts#10-57) now auto-expires trials and returns SOP-compliant JSON: `{ message, action: "subscribe", redirectTo: "/billing" }`.

### 4. Routes: [setupRoutes.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/routes/setupRoutes.ts)
- Uses `PLANS.trial.durationDays` instead of hardcoded `7`
- Sets `subscriptionStatus = "trial"` on first API key save

### 5. Routes: [subscriptionRoutes.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/routes/subscriptionRoutes.ts)
`BASE_PRICE` now reads from `PLANS.growth.priceInPaise` (349900) instead of hardcoded 400000.

### 6. Routes: [authRoutes.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/routes/authRoutes.ts)
- OAuth callback uses `isSubscriptionActive` virtual instead of `!== "active"` check
- `/api/auth/me` now returns `trialExpiresAt`

### 7. Scheduler: [scheduler.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/services/scheduler.ts)
Added `{ subscriptionStatus: "trial" }` to the user query so trial users get call polling.

### 8. Frontend: [AuthContext.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/contexts/AuthContext.tsx)
Added `trialExpiresAt` and `"trial"` to [SessionUser](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/contexts/AuthContext.tsx#8-22) interface.

### 9. Frontend: [Subscribe.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/pages/Subscribe.tsx)
- Price: ₹4,000 → **₹3,499**
- Plan name: "Anti-Gravity CRM" → **"Growth Plan"**
- Features: replaced with SOP-defined Growth Plan features (8 items)

---

## SOP Checklist Verification

| Requirement | Status |
|---|---|
| `trialEndDate` calculated server-side using `PLANS.trial.durationDays` | ✅ |
| Trial expiry checked on every request via middleware | ✅ |
| After trial ends → frontend receives `redirectTo: '/billing'` | ✅ |
| Subscribe page shows correct plan features | ✅ |
| Price is ₹3,499 everywhere | ✅ |
| Single source of truth for pricing ([config/plans.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/config/plans.ts)) | ✅ |

---

## Manual Testing Needed
- Google OAuth login → setup API key → verify status becomes `trial`
- Wait for trial expiry (or manually set `trialExpiresAt` in DB to past) → verify redirect to `/billing`
- Complete Razorpay payment → verify status becomes `active`
