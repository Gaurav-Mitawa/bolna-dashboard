# 🚀 MASTER SOP — CRM + Campaign + Subscription Micro SaaS
### Production-Level Build & Review Guide (Claude Code Friendly)

> **How to use this SOP:**
> - If a feature is **already built** → Review it using the checklist. Fix only what's broken or insecure.
> - If a feature is **not built** → Follow the implementation steps.
> - Do NOT rewrite working code. Patch, not replace.

---

## 🗂️ PROJECT OVERVIEW

| Stack | Tech |
|---|---|
| Frontend | React (or Next.js) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Auth | Passport.js + Google OAuth 2.0 |
| Payments | Razorpay |
| Architecture | MVC, async/await, REST API |

**Subscription Plans:**
- Launch Trial — 7 days free, full access
- Growth Plan — ₹3499/month

**Coupon Codes (Internal Use Only — One Per User):**
- `BOLNA10` → 10% off (₹3499 → ₹3149)
- `BOLNA20` → 20% off (₹3499 → ₹2799)
- `BOLNA30` → 30% off (₹3499 → ₹2449)

---

---

# ✅ PHASE 1 — AUTHENTICATION SYSTEM

## Goal
Secure Google login, user creation in MongoDB, and Bolna API key setup per user.

---

## 1.1 — Review Google OAuth (If Already Built)

### Code Review Checklist:
- [ ] Is `passport-google-oauth20` installed and configured?
- [ ] Is `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` stored in `.env` (NOT hardcoded)?
- [ ] After login, does it check if user exists in DB? If yes → login. If no → create new user.
- [ ] Is `req.user` available after login (session/JWT)?
- [ ] Is the callback URL set to your production domain (not localhost) in Google Console?

### Security Checks:
- [ ] `.env` is in `.gitignore` — confirm this first
- [ ] No credentials are `console.log()`-ed anywhere
- [ ] Sessions use `express-session` with a strong secret (`SESSION_SECRET` from `.env`)
- [ ] `sameSite: 'lax'` and `secure: true` (in production) on cookies

### Users Collection Schema to Verify:
```js
{
  _id: ObjectId,
  googleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  profileImage: String,
  bolnaApiKey: { type: String, default: null },  // must be encrypted at rest
  subscriptionStatus: { type: String, enum: ['inactive', 'trial', 'active'], default: 'inactive' },
  trialStartDate: { type: Date, default: null },
  trialEndDate: { type: Date, default: null },
  isNewUser: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
}
```

### If Issues Found:
- If `googleId` is not unique indexed → add `{ unique: true }` to schema
- If `bolnaApiKey` is plain text → encrypt it (see Phase 1.2)
- If sessions persist after logout → ensure `req.logout()` is called properly

---

## 1.2 — Bolna API Setup Page (`/setup-api`)

### Logic Flow:
```
After login:
  → if bolnaApiKey is null OR empty → redirect to /setup-api
  → if bolnaApiKey exists → redirect to /dashboard
```

### Code Review Checklist:
- [ ] Route `/setup-api` is protected (requires auth middleware)
- [ ] API key is saved per user (NOT to a global `.env`)
- [ ] API key is **encrypted before saving** to MongoDB

### How to Encrypt API Key (Add if Missing):
```js
// utils/crypto.js
const crypto = require('crypto');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 char string in .env
const IV_LENGTH = 16;

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

exports.decrypt = (text) => {
  const [iv, encryptedText] = text.split(':').map(part => Buffer.from(part, 'hex'));
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
```

### .env Variables Required for Phase 1:
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
SESSION_SECRET=a_very_long_random_string
ENCRYPTION_KEY=32_character_random_string_here
MONGODB_URI=
```

---

---

# ✅ PHASE 2 — SUBSCRIPTION & BILLING SYSTEM

## 🧠 Product Positioning

Your platform sits **on top of Bolna AI**. Your value is NOT the infrastructure — Bolna handles that. Your value is everything built around it:

| Layer | What You Provide |
|---|---|
| Agent Layer | Inbound/Outbound call monitoring, AI Agent Control Panel, Campaigns, Personalised Calls |
| CRM Layer | Lead funnel, Pipeline management, Booking system |
| Business Layer | Centralized dashboard, Performance tracking, Recording access |

This positioning matters for your subscription page copy, your onboarding popup, and how you describe features during trial. Make sure the UI reflects this — you are selling a **business-ready AI CRM**, not a Bolna reseller.

---

## Goal
7-day free trial for new users, ₹3499/month Growth Plan via Razorpay, coupon discounts.

---

## 2.0 — Subscription Plans Reference

### 🚀 Plan 1: Launch Trial — 7 Days Free

> Shown as popup after user saves their Bolna API key for the first time.

**What they get during trial:**
- Inbound & Outbound call monitoring
- AI Agent Control Panel
- AI Agent Campaigns
- Personalised Calls
- Booking System
- CRM with Lead Funnel

Trial gives **full access** to all features. No credit card required at signup.

---

### 💎 Plan 2: Growth Plan — ₹3499/month

Shown on `/subscription` or `/billing` page after trial ends.

**Agent Layer:**
- Inbound & Outbound call monitoring
- AI Agent Control Panel
- AI Agent Campaigns
- Personalised Calls
- Call Recordings

**CRM Layer:**
- Unlimited CRM
- Lead Pipeline Management
- Booking System

---

### Subscription Config (Server-Side — Single Source of Truth):
```js
// config/plans.js
const PLANS = {
  trial: {
    name: 'Launch Trial',
    durationDays: 7,
    price: 0,
    features: [
      'Inbound & Outbound call monitoring',
      'AI Agent Control Panel',
      'AI Agent Campaigns',
      'Personalised Calls',
      'Booking System',
      'CRM with Lead Funnel'
    ]
  },
  growth: {
    name: 'Growth Plan',
    price: 3499,          // INR
    priceInPaise: 349900, // for Razorpay (multiply by 100)
    features: [
      'Inbound & Outbound call monitoring',
      'AI Agent Control Panel',
      'AI Agent Campaigns',
      'Personalised Calls',
      'Call Recordings',
      'Unlimited CRM',
      'Lead Pipeline Management',
      'Booking System'
    ]
  }
};

module.exports = PLANS;
```

> **Why this file exists:** Keeps pricing and feature lists in one place. If you change the price, change it here only — not scattered across 5 routes.

---

## 2.1 — 7-Day Free Trial Logic

### When to Trigger:
- User logs in for the **first time** (new user in DB)
- After they save their Bolna API key on `/setup-api`
- Show a popup: **"Start your 7-day free trial — full access, no card needed"**
- Popup describes the plan features from `PLANS.trial.features`

### Backend Logic (Add or Review):
```js
// On first API key save
const { PLANS } = require('../config/plans');

if (user.isNewUser && user.subscriptionStatus === 'inactive') {
  user.subscriptionStatus = 'trial';
  user.trialStartDate = new Date();
  user.trialEndDate = new Date(
    Date.now() + PLANS.trial.durationDays * 24 * 60 * 60 * 1000
  );
  user.isNewUser = false;
  await user.save();
}
```

### Middleware to Check Trial Expiry (Add to protected routes):
```js
// middleware/checkSubscription.js
module.exports = async (req, res, next) => {
  const user = req.user;

  if (user.subscriptionStatus === 'trial') {
    if (new Date() > user.trialEndDate) {
      user.subscriptionStatus = 'inactive';
      await user.save();
      // Return redirect hint so frontend can send to /billing
      return res.status(403).json({
        message: 'Trial expired.',
        action: 'subscribe',
        redirectTo: '/billing'
      });
    }
    return next(); // trial still active
  }

  if (user.subscriptionStatus === 'active') {
    return next();
  }

  // inactive or unknown
  return res.status(403).json({
    message: 'Subscription required.',
    action: 'subscribe',
    redirectTo: '/billing'
  });
};
```

### Code Review Checklist:
- [ ] `isNewUser` flag resets to `false` after first API key save
- [ ] `trialEndDate` is calculated server-side using `PLANS.trial.durationDays`, NOT client-side
- [ ] Trial expiry is checked on every dashboard/API request via middleware
- [ ] After trial ends → frontend receives `redirectTo: '/billing'` and navigates there (not a raw 403 error screen)
- [ ] Trial popup on frontend shows plan features, not generic text

---

## 2.2 — Razorpay Integration Review

### Code Review Checklist:
- [ ] `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are in `.env` (not hardcoded)
- [ ] Amount used for order creation is `PLANS.growth.priceInPaise` from `config/plans.js` (not hardcoded `349900`)
- [ ] Order is created **server-side**, amount is never trusted from frontend
- [ ] Payment signature is verified **server-side** after payment

### Payments Collection Schema to Verify:
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true },
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String, default: null },
  planName: { type: String, default: 'growth' },     // which plan was purchased
  amountPaid: { type: Number, required: true },       // in paise (₹3499 = 349900)
  couponUsed: { type: String, default: null },
  discountAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
  createdAt: { type: Date, default: Date.now }
}
```

### Order Creation Route (Review or Add):
```js
// POST /api/payment/create-order
const { PLANS } = require('../config/plans');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.post('/create-order', isAuthenticated, async (req, res) => {
  const { couponCode } = req.body;
  let amount = PLANS.growth.priceInPaise; // 349900 paise = ₹3499
  let discountAmount = 0;
  let couponUsed = null;

  // Apply coupon if provided (validation inline, same as coupon route)
  if (couponCode) {
    const coupon = COUPONS[couponCode.toUpperCase()];
    if (coupon) {
      discountAmount = Math.round((PLANS.growth.price * coupon.discount) / 100);
      amount = (PLANS.growth.price - discountAmount) * 100; // back to paise
      couponUsed = couponCode.toUpperCase();
    }
  }

  const order = await razorpay.orders.create({
    amount,
    currency: 'INR',
    receipt: `receipt_${Date.now()}`
  });

  // Save pending payment record
  await Payment.create({
    userId: req.user._id,
    razorpayOrderId: order.id,
    planName: 'growth',
    amountPaid: amount,
    couponUsed,
    discountAmount: discountAmount * 100, // store in paise
    status: 'created'
  });

  res.json({ orderId: order.id, amount, key: process.env.RAZORPAY_KEY_ID });
});
```

### Signature Verification (Must Exist):
```js
const crypto = require('crypto');

const verifyPayment = (orderId, paymentId, signature) => {
  const body = orderId + '|' + paymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === signature;
};
```

### Security Checks:
- [ ] `subscriptionStatus` is set to `active` ONLY after signature is verified
- [ ] User cannot self-activate by hitting the success route directly (always verify signature)
- [ ] Razorpay Key ID (public) is safe to expose to frontend — Key Secret is NEVER sent to frontend
- [ ] Amount in the order creation route comes from `PLANS.growth.priceInPaise`, not `req.body`

---

## 2.3 — Coupon System Review

### Coupons (Hardcoded Server-Side Only — Never Expose to Client):
```js
// config/coupons.js
// These codes are given out manually by you. One-time use per user (optional).
// Base price: ₹3499 (Growth Plan)

const COUPONS = {
  'BOLNA10': { discount: 10, description: '10% off — ₹3149/month' },
  'BOLNA20': { discount: 20, description: '20% off — ₹2799/month' },
  'BOLNA30': { discount: 30, description: '30% off — ₹2449/month' },
};

module.exports = COUPONS;
```

### Discount Amounts (Updated for ₹3499 base):
| Coupon | Discount | Final Price |
|---|---|---|
| `BOLNA10` | 10% (₹350) | ₹3149/month |
| `BOLNA20` | 20% (₹700) | ₹2799/month |
| `BOLNA30` | 30% (₹1050) | ₹2449/month |

### Coupon Validation Route:
```js
// POST /api/coupon/validate
const { PLANS } = require('../config/plans');

router.post('/validate', isAuthenticated, async (req, res) => {
  const { couponCode } = req.body;
  const coupon = COUPONS[couponCode?.toUpperCase()];

  if (!coupon) {
    return res.status(400).json({ valid: false, message: 'Invalid coupon code' });
  }

  const discountAmount = Math.round((PLANS.growth.price * coupon.discount) / 100);
  const finalAmount = PLANS.growth.price - discountAmount;

  return res.json({
    valid: true,
    couponCode: couponCode.toUpperCase(),
    discountAmount,
    finalAmount,
    description: coupon.description
  });
});
```

### Code Review Checklist:
- [ ] Coupon codes are NEVER in frontend code, `.env`, or any API list response
- [ ] Discount is calculated using `PLANS.growth.price` from `config/plans.js` (not hardcoded `3499`)
- [ ] Discount is calculated server-side before the Razorpay order is created
- [ ] User can only apply one coupon per payment session

---

## 2.4 — Razorpay Webhook (Edge Case Handler)

### Why This Is Needed:
The standard Razorpay flow relies on the user's browser returning to your success callback. If the user closes the tab, loses internet, or the browser crashes after payment — your server never gets notified. The webhook fixes this by having Razorpay call your server directly, regardless of what the user's browser does.

### Setup Steps:
1. Go to Razorpay Dashboard → Settings → Webhooks → Add New Webhook
2. Set URL to: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events: `payment.captured`, `payment.failed`
4. Set a Webhook Secret and add it to `.env` as `RAZORPAY_WEBHOOK_SECRET`

### Webhook Route (Add if Missing):
```js
// routes/webhooks.js
const crypto = require('crypto');
const express = require('express');
const router = express.Router();

// IMPORTANT: This route needs raw body, NOT json-parsed body
// Add before app.use(express.json()) for this specific route
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Step 1: Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: 'Invalid webhook signature' });
  }

  const event = JSON.parse(req.body);

  // Step 2: Handle payment captured
  if (event.event === 'payment.captured') {
    const paymentId = event.payload.payment.entity.id;
    const orderId = event.payload.payment.entity.order_id;
    const amountPaid = event.payload.payment.entity.amount; // in paise

    // Find the payment record by orderId
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    if (payment && payment.status !== 'paid') {
      payment.razorpayPaymentId = paymentId;
      payment.status = 'paid';
      await payment.save();

      // Activate subscription
      await User.findByIdAndUpdate(payment.userId, {
        subscriptionStatus: 'active'
      });
    }
  }

  // Step 3: Handle payment failed
  if (event.event === 'payment.failed') {
    const orderId = event.payload.payment.entity.order_id;
    await Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      { status: 'failed' }
    );
  }

  res.json({ received: true });
});

module.exports = router;
```

### Register the Webhook Route (In `app.js` / `server.js`):
```js
// CRITICAL: Register webhook route BEFORE express.json() middleware
// because it needs the raw body buffer for signature verification
app.use('/api/webhooks', require('./routes/webhooks'));
app.use(express.json()); // All other routes get JSON parsing
```

### Code Review Checklist:
- [ ] Webhook secret is in `.env` as `RAZORPAY_WEBHOOK_SECRET`
- [ ] Webhook route uses `express.raw()`, NOT `express.json()` (signature verification will break otherwise)
- [ ] Webhook route is registered BEFORE `app.use(express.json())`
- [ ] Payment status is checked before updating (prevent double activation: `payment.status !== 'paid'`)
- [ ] Webhook URL is added in Razorpay Dashboard with correct events selected
- [ ] Razorpay Dashboard → Webhooks → your URL shows "Active" status

---

## 2.5 — Billing Page Cleanup

### Change Required:
Remove the **Cost Breakdown Section** from `/billing` page.

**Keep:**
- Current plan name (Launch Trial / Growth Plan)
- Subscription status (active / trial / inactive)
- Trial end date with days remaining (if on trial) — e.g. "4 days left in your trial"
- Payment history table (date, amount paid, coupon used if any)
- Upgrade CTA button when on trial: **"Upgrade to Growth Plan — ₹3499/month"**

**Remove:**
- Any per-feature pricing breakdown
- Any "cost per X" explanations
- Any UI that makes the platform look like a utility bill

> **UX Note:** The billing page should feel like a SaaS dashboard, not an invoice. Keep it clean — plan name, status, history, and one clear upgrade button.

---

---

# ✅ PHASE 3 — CUSTOMERS PAGE (`/customers`)

## Goal
Manual lead entry (single), bulk CSV upload, edit leads. Full CRUD with user data isolation.

---

## 3.1 — Customers Collection Schema to Verify:
```js
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ['fresh', 'interested', 'not_interested', 'booked', 'NA', 'queries'],
    default: 'fresh'
  },
  pastConversations: [
    {
      date: { type: Date, default: Date.now },
      summary: String,
      notes: String
    }
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

### Compound Index (Add if Missing):
```js
// Prevents duplicate phone per user (not globally)
CustomerSchema.index({ userId: 1, phoneNumber: 1 }, { unique: true });
```

---

## 3.2 — Single Lead Entry Review

### Code Review Checklist:
- [ ] `userId` is taken from `req.user._id` (server-side) — NOT from frontend input
- [ ] Phone number is validated (format: `+91XXXXXXXXXX`)
- [ ] Duplicate phone number check per user (not globally)
- [ ] Status is from the allowed enum list only

### Phone Validation (Add if Missing):
```js
const phoneRegex = /^\+[1-9]\d{6,14}$/;
if (!phoneRegex.test(phoneNumber)) {
  return res.status(400).json({ message: 'Invalid phone number. Use format: +91XXXXXXXXXX' });
}
```

---

## 3.3 — Bulk CSV Upload Review

### Code Review Checklist:
- [ ] CSV parsing is done server-side (using `csv-parse` or `papaparse` on backend)
- [ ] Only `name` and `phoneNumber` are taken from CSV (status defaults to `fresh`)
- [ ] Phone numbers are auto-formatted to include `+91` if missing
- [ ] Duplicate phone numbers within the CSV itself are removed before insert
- [ ] Duplicate phone numbers already in DB for that user are skipped (not errored)
- [ ] File size limit is set (e.g., 5MB max)
- [ ] File type is validated (only `.csv` accepted)

### Bulk Insert Logic (Review or Add):
```js
// Use insertMany with ordered: false to skip duplicates, not fail entire batch
await Customer.insertMany(records, { ordered: false }).catch(err => {
  if (err.code !== 11000) throw err; // 11000 = duplicate key, acceptable
});
```

---

## 3.4 — Edit Feature Review

### Code Review Checklist:
- [ ] Edit route verifies `userId` matches the record's `userId` before updating
- [ ] `updatedAt` is refreshed on every edit
- [ ] Only `name`, `phoneNumber`, `status` are editable (not `userId`, `_id`, `createdAt`)

### Safe Update Pattern:
```js
// PUT /api/customers/:id
const updated = await Customer.findOneAndUpdate(
  { _id: req.params.id, userId: req.user._id }, // userId check is critical
  { name, phoneNumber, status, updatedAt: new Date() },
  { new: true, runValidators: true }
);
if (!updated) return res.status(404).json({ message: 'Lead not found' });
```

---

---

# ✅ PHASE 4 — CAMPAIGN AUTOMATION (`/campaigns`)

## Goal
Auto-generate Bolna-format CSV from CRM leads, download, and run campaigns.

---

## 4.1 — Campaign Creation UI Review

### Change Required on Frontend:
- Remove the duplicate "New Campaign" button if there are two
- Keep ONE "Create Campaign" button (top-right)
- On click → modal opens with status selector dropdown

### Status Options in Dropdown:
`fresh`, `interested`, `not_interested`, `booked`, `NA`, `queries`

---

## 4.2 — Auto-Fetch Logic Review

### Code Review Checklist:
- [ ] Fetch ONLY records where `userId === req.user._id` (strict isolation)
- [ ] Status filter is applied server-side (never trusted from URL param without validation)
- [ ] Returned fields: only `name`, `phoneNumber`, `pastConversations`

### Route to Review:
```js
// GET /api/campaigns/leads?status=interested
router.get('/leads', isAuthenticated, checkSubscription, async (req, res) => {
  const { status } = req.query;
  const allowedStatuses = ['fresh', 'interested', 'not_interested', 'booked', 'NA', 'queries'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const leads = await Customer.find(
    { userId: req.user._id, status },
    { name: 1, phoneNumber: 1, pastConversations: 1, _id: 0 }
  );
  res.json(leads);
});
```

---

## 4.3 — CSV Generation (Bolna Format) Review

### Bolna CSV Format:
```
name,phone,history
John Doe,+919876543210,"Last call: Interested in demo"
Jane Smith,+918765432100,""
```

### Generation Logic (Review or Add):
```js
const generateBolnaCSV = (leads) => {
  const header = 'name,phone,history';
  const rows = leads.map(lead => {
    const lastConv = lead.pastConversations?.slice(-1)[0];
    const history = lastConv?.summary || '';
    // Escape commas in history
    const safeHistory = `"${history.replace(/"/g, '""')}"`;
    return `${lead.name},${lead.phoneNumber},${safeHistory}`;
  });
  return [header, ...rows].join('\n');
};
```

### Code Review Checklist:
- [ ] CSV is generated server-side and sent as a file download response
- [ ] OR: JSON is returned and CSV is generated client-side (both OK — pick one, be consistent)
- [ ] Commas and quotes inside data are escaped properly
- [ ] Download button appears after leads are fetched

---

## 3.5 — Pagination for Customers Page

### Why This Is Needed:
Without pagination, if a user uploads 500+ leads, the entire collection loads at once. This will slow the page to a crawl, and at 5000+ records it will crash the browser tab entirely.

### Backend Route (Review or Add):
```js
// GET /api/customers?page=1&limit=50&status=interested
router.get('/', isAuthenticated, checkSubscription, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50); // cap at 100 max
  const skip = (page - 1) * limit;

  // Optional status filter
  const filter = { userId: req.user._id };
  if (req.query.status) {
    const allowedStatuses = ['fresh', 'interested', 'not_interested', 'booked', 'NA', 'queries'];
    if (allowedStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }
  }

  // Run count and data fetch in parallel for speed
  const [total, customers] = await Promise.all([
    Customer.countDocuments(filter),
    Customer.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .select('name phoneNumber status createdAt updatedAt')
  ]);

  res.json({
    customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  });
});
```

### Frontend Integration (Review or Add):
```js
// State needed
const [page, setPage] = useState(1);
const [pagination, setPagination] = useState({});

// Fetch function
const fetchCustomers = async (pageNum = 1) => {
  const res = await fetch(`/api/customers?page=${pageNum}&limit=50`);
  const data = await res.json();
  setCustomers(data.customers);
  setPagination(data.pagination);
};

// Simple Prev / Next controls
<div>
  <button disabled={!pagination.hasPrevPage} onClick={() => fetchCustomers(page - 1)}>
    Previous
  </button>
  <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
  <button disabled={!pagination.hasNextPage} onClick={() => fetchCustomers(page + 1)}>
    Next
  </button>
</div>
```

### Code Review Checklist:
- [ ] `limit` is capped server-side (user cannot request 10,000 records by passing `limit=10000`)
- [ ] `page` cannot be negative or zero (use `Math.max(1, ...)`)
- [ ] Sort order is consistent (always `createdAt: -1`) so pagination results don't shift between pages
- [ ] When a new lead is added or edited, the current page refreshes automatically
- [ ] Bulk upload redirects to page 1 after completion (not a stale page number)
- [ ] Status filter works together with pagination (not two separate fetch calls)

--- (Run This on ALL Phases)

This is the most important section. Run this before deploying to production.

---

## Environment & Secrets
- [ ] `.env` file is in `.gitignore` — **check this first**
- [ ] No hardcoded secrets, API keys, or passwords in any file
- [ ] `ENCRYPTION_KEY` is exactly 32 characters
- [ ] All third-party keys (Razorpay, Google, MongoDB) are in `.env`
- [ ] Production `.env` is different from development `.env`

## Authentication
- [ ] All dashboard routes have `isAuthenticated` middleware
- [ ] All API routes have `isAuthenticated` middleware
- [ ] Session secret is a long random string (not "secret" or "mysecret")
- [ ] Sessions expire (set `maxAge` in session config)
- [ ] Google OAuth callback URL is whitelisted in Google Console

## Data Isolation (Critical for Multi-User SaaS)
- [ ] Every DB query includes `userId: req.user._id` filter
- [ ] Users cannot access other users' customers, campaigns, or payments
- [ ] Users cannot access other users' Bolna API keys

## API Security
- [ ] Rate limiting on login and payment routes (use `express-rate-limit`)
- [ ] Input validation on all POST/PUT routes (use `express-validator` or manual checks)
- [ ] MongoDB injection protection (mongoose handles this, but avoid `req.body` directly in `find()`)
- [ ] CORS is configured to allow only your frontend domain
- [ ] Helmet.js is installed and used (`app.use(helmet())`)

## Bolna API Key Security
- [ ] API key is encrypted before saving to DB (using `crypto.js` util from Phase 1.2)
- [ ] API key is decrypted only when needed for an API call, never returned to frontend
- [ ] Frontend never receives the raw API key in any API response

## Payment Security
- [ ] Razorpay payment signature is ALWAYS verified server-side
- [ ] Amount is computed server-side, never trusted from frontend
- [ ] Coupon codes live only in server config, never in frontend bundle

---

---

# 🧹 CODE QUALITY CHECKLIST (Before Production)

- [ ] All routes return proper HTTP status codes (200, 400, 401, 403, 404, 500)
- [ ] All async functions have `try/catch` blocks
- [ ] No `console.log()` with sensitive data in production (use a logger like `winston`)
- [ ] No unused `npm` packages installed
- [ ] MongoDB Atlas: IP whitelist set to production server IP (not `0.0.0.0/0`)
- [ ] MongoDB Atlas: Database user has minimum required permissions (not root)
- [ ] Payment routes are idempotent (same payment ID cannot activate subscription twice)

---

---

# 📋 PHASE EXECUTION ORDER (For Claude Code)

Use this order when building or reviewing with Claude Code:

```
Phase 1a → Review Google Auth + User Schema + Session Security
Phase 1b → Review/Add Bolna API encryption + /setup-api page logic
Phase 2a → Review 7-day trial logic + trial middleware
Phase 2b → Review Razorpay integration + signature verification
Phase 2c → Review/Add coupon system (BOLNA10, BOLNA20, BOLNA30)
Phase 2d → Add Razorpay webhook route + register before express.json()
Phase 2e → Remove cost breakdown from /billing page
Phase 3a → Review Customers schema + compound index
Phase 3b → Review single lead creation + phone validation
Phase 3c → Review bulk CSV upload + duplicate handling
Phase 3d → Review edit feature + userId check
Phase 3e → Add pagination to /customers API + frontend controls
Phase 4a → Review campaign fetch route + data isolation
Phase 4b → Review CSV generation + Bolna format
Phase 5  → Full security audit using the checklist above
Phase 6  → Code quality review + remove dead code
```

---

---

# 💡 SUGGESTIONS TO MAKE IT BETTER

## 1. Add Soft Delete for Leads
Instead of permanently deleting, add `isDeleted: Boolean` flag. Prevents accidental data loss.

## 2. Subscription Renewal Reminders
Before trial expires (e.g., day 5), send an email reminder. Use Nodemailer or a service like Resend.

## 3. Webhook for Razorpay
Add a Razorpay webhook endpoint to handle payment failures and refunds automatically. Better than only relying on the callback.

## 4. Pagination for Customers Page
If users upload 1000+ leads, load them in pages (e.g., 50 per page). Add `?page=1&limit=50` to the customers API.

## 5. Campaign History
Save a record of which campaigns were run, when, and with how many leads. Helps users track performance.

## 6. Input Sanitization
Use `DOMPurify` on frontend and `validator.js` on backend to sanitize all text inputs.

## 7. Audit Logs (Optional for Later)
Log who did what and when (created lead, ran campaign, changed subscription). Useful for debugging and trust.

---

*SOP Version 1.0 — Built for Production Micro SaaS*