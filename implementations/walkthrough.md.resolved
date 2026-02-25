# Razorpay Integration & Billing Amount Display — Walkthrough

## Changes Made

### 1. Backend — Last Payment in Dashboard API
**File:** [dashboardRoutes.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/routes/dashboardRoutes.ts)

- Imported [Payment](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/models/Payment.ts#3-15) model
- Queries the most recent successful payment for the user
- Returns `lastPayment` object with: `amountPaid` (₹), `couponUsed`, `discountAmount` (₹), `periodStart`, `periodEnd`, `paidAt`

### 2. Frontend — Last Payment Card on Billing Page
**File:** [Billing.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/pages/Billing.tsx)

- Added `lastPayment` to [SubscriptionInfo](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/pages/Billing.tsx#29-46) interface
- Added `CreditCard` and `Tag` icon imports
- New **"Last Payment"** card between Subscription and Wallet cards showing:
  - Amount paid (bold ₹ display)
  - Coupon tag with discount amount (green badge)
  - Billing period (start — end dates)
- Card only renders if a payment exists

### 3. Frontend — Razor Checkout Description
**File:** [Subscribe.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/client/src/pages/Subscribe.tsx)

- Razorpay modal description now shows:
  - With coupon: `"Growth Plan — ₹2,799 (SAVE20 applied)"`
  - Without coupon: `"Growth Plan — ₹3,499 / month"`

## Payment Flow Summary

```
User clicks Pay → POST /create-order (with coupon) → Razorpay order created at discounted amount
→ Razorpay modal opens (shows discounted amount + description)
→ User pays → POST /verify-payment → Payment record saved → Subscription activated
→ Billing page shows: subscription status + last payment amount + coupon info
```

## Verification
- `/api/subscribe/config` endpoint exists and returns `razorpayKeyId`
- Razorpay keys configured in [.env](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/.env) (`rzp_live_...`)
- [Payment](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/models/Payment.ts#3-15) model already stores `amountPaid`, `couponUsed`, `discountAmount`
- Coupon discount is deducted server-side before Razorpay order creation
