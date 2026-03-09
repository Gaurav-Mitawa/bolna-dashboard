# BOLNA ClusterX — System Architecture

> **Last Updated:** 2026-03-09
> **Stack:** Express + TypeScript · React + Vite · MongoDB Atlas · Bolna Voice AI · Razorpay · Google OAuth

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Request Lifecycle](#2-request-lifecycle)
3. [Authentication Flow](#3-authentication-flow)
4. [Background Poller — 4-Phase Pipeline](#4-background-poller--4-phase-pipeline)
5. [All API Endpoints](#5-all-api-endpoints)
6. [MongoDB Models](#6-mongodb-models)
7. [Frontend → Backend API Map](#7-frontend--backend-api-map)
8. [Subscription & Payment Flow](#8-subscription--payment-flow)
9. [Tenant Isolation](#9-tenant-isolation)
10. [LLM Analysis Service](#10-llm-analysis-service)
11. [Environment Variables](#11-environment-variables)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BOLNA ClusterX                                     │
│                                                                             │
│  ┌──────────────┐     HTTPS      ┌───────────────────────────────────────┐  │
│  │              │ ─────────────► │        Express Server (port 5000)     │  │
│  │  React + Vite│                │                                       │  │
│  │  Frontend    │ ◄───────────── │  ┌─────────┐  ┌────────────────────┐ │  │
│  │  (SPA)       │    JSON API    │  │ Auth    │  │  Business Routes   │ │  │
│  └──────────────┘                │  │Middleware│  │  (CRM, Campaigns,  │ │  │
│                                  │  └─────────┘  │   Calls, etc.)     │ │  │
│  ┌──────────────┐                │               └────────────────────┘ │  │
│  │  Background  │                │  ┌──────────────────────────────────┐ │  │
│  │  Poller      │                │  │   FastAPI Proxy (Analytics,      │ │  │
│  │  (5 min)     │                │  │   Agents, Chat, VAPI)            │ │  │
│  └──────┬───────┘                │  └──────────────────────────────────┘ │  │
│         │                        └───────────────────────────────────────┘  │
│         │ sync                                    │                          │
│         ▼                                         │ Mongoose ODM             │
│  ┌──────────────┐                                 ▼                          │
│  │  Bolna       │                       ┌─────────────────┐                 │
│  │  Voice AI    │                       │  MongoDB Atlas  │                 │
│  │  API         │                       │  (Single SSOT)  │                 │
│  └──────────────┘                       └─────────────────┘                 │
│                                                                             │
│  External Services:                                                         │
│  ┌────────────┐  ┌───────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │  Google    │  │   Razorpay    │  │  Grok / Groq / │  │  Bolna.ai     │  │
│  │  OAuth 2.0 │  │  Payments     │  │  Gemini (LLM)  │  │  Voice API    │  │
│  └────────────┘  └───────────────┘  └────────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key Architecture Rules:**
- **MongoDB is the Single Source of Truth** — Frontend never calls Bolna API for data reads
- **Background poller syncs Bolna → MongoDB** every 5 minutes
- **Tenant isolation enforced everywhere** — every MongoDB query is scoped by `userId`
- **Bolna API key** is AES-256 encrypted at rest; decrypted only in backend services

---

## 2. Request Lifecycle

Every HTTP request through the Express server goes through this middleware stack in order:

```
Incoming HTTP Request
        │
        ▼
┌───────────────────────┐
│  1. Request Logger    │  logs all /api/* requests (method, path, status, duration)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  2. Session Middleware │  express-session → MongoDB store → 7-day cookie
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  3. Passport OAuth    │  deserializes user from session → populates req.user
└───────────┬───────────┘
            │
            ├──── /api/webhooks ──►  Raw body parser (HMAC needs raw Buffer)
            │                        → Razorpay webhook handler
            │
            ▼
┌───────────────────────┐
│  4. Body Parsers      │  express.json() + urlencoded
│                       │  (skipped for: /api/agents, /api/analytics,
│                       │   /api/chat, /api/vapi, /webhooks — proxy routes)
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│  5. Tenant Context    │  attachTenantContext() → sets req.tenantId = req.user._id
└───────────┬───────────┘
            │
            ├──── /api/auth/*          → authRoutes (no auth required)
            ├──── /api/health          → health check
            ├──── /api/setup-api/*     → setupRoutes (isAuthenticated)
            ├──── /api/settings/*      → settingsRoutes (isAuthenticated)
            ├──── /api/subscribe/*     → subscriptionRoutes (isAuthenticated)
            ├──── /api/crm/*           → crmRoutes (isAuthenticated + isSubscribed)
            ├──── /api/campaigns/*     → campaignRoutes (isAuthenticated + isSubscribed)
            ├──── /api/bolna/*         → bolnaRoutes (isAuthenticated + isSubscribed + hasBolnaKey)
            ├──── /api/dashboard/*     → dashboardRoutes (isAuthenticated + isSubscribed)
            ├──── /api/call-history/*  → callProcessorRoutes (isAuthenticated + isSubscribed)
            ├──── /api/contacts/*      → contactRoutes (isAuthenticated)
            ├──── /api/analytics/*     → FastAPI proxy (http://localhost:8000)
            ├──── /api/agents/*        → FastAPI proxy (http://localhost:8000)
            ├──── /api/vapi/*          → FastAPI proxy (http://localhost:8000)
            ├──── /api/chat/*          → FastAPI proxy (http://localhost:8000)
            └──── /webhooks/*          → FastAPI proxy (legacy Bolna webhooks)
```

### Auth Middleware Chain

```
isAuthenticated()          isSubscribed()              hasBolnaKey()
      │                          │                           │
      ▼                          ▼                           ▼
req.isAuthenticated()    auto-expire trials &       user.bolnaApiKey
      │                  subscriptions if expired         != null
  yes │  no              check isSubscriptionActive          │
      │   └─► 401             │                         yes │  no
      │                   yes │  no                         │   └─► 400
      ▼                       │   └─► 403                   ▼
 next()                       ▼                          next()
                           next()
```

---

## 3. Authentication Flow

```
User clicks "Sign in with Google"
        │
        ▼
GET /api/auth/google
        │
        ▼
Passport redirects to Google OAuth consent screen
        │
        ▼  (user approves)
GET /api/auth/google/callback?code=...
        │
        ▼
Passport exchanges code for tokens
        │
        ▼
passport.js fetches Google profile
        │
        ├── User exists in MongoDB? ──YES──► Update profile (name, image)
        │                                          │
        └──────── NO ──────────────────► Create new User document
                                                   │
                                         (bolnaApiKey = null)
                                         (subscriptionStatus = "inactive")
                                                   │
                                    ◄──────────────┘
                                         │
                                         ▼
                                 req.logIn(user) → session saved to MongoDB
                                         │
                                         ▼
                            Redirect to frontend:
                            - Has Bolna API key? → /dashboard
                            - No API key?        → /setup
```

**Session Storage:**
- Provider: MongoDB (`connect-mongo`)
- Cookie: `httpOnly: true`, `sameSite: lax`, 7-day TTL
- `secure: true` in production (HTTPS only)

---

## 4. Background Poller — 4-Phase Pipeline

The poller runs on server boot and every `POLLER_INTERVAL_MS` (default 5 minutes).

```
scheduler.ts
    │
    ├── Runs immediately on server start
    └── Repeats every 5 min (setInterval)
              │
              ▼
        runSyncPoller()
              │
    ┌─────────▼─────────────────────────────────────────────────────┐
    │  PHASE 1: Agent Sync                                           │
    │                                                               │
    │  Find all Users with { bolnaApiKey != null, subscription      │
    │  active/trial }                                               │
    │         │                                                     │
    │         ▼  (for each user)                                    │
    │  GET /v2/agent/all  →  Bolna API                             │
    │         │                                                     │
    │         ▼                                                     │
    │  Agent.findOneAndUpdate({ bolnaAgentId }, { userId, ... })    │
    │  (upsert=true) → builds tenant ownership map in MongoDB       │
    └─────────┬─────────────────────────────────────────────────────┘
              │
    ┌─────────▼─────────────────────────────────────────────────────┐
    │  PHASE 2: Call Sync                                            │
    │                                                               │
    │  Fetch ALL active agents from MongoDB Agent collection        │
    │  (userId comes from here — NEVER from Bolna response)         │
    │         │                                                     │
    │         ▼  (for each agent, paginated 50/page)                │
    │  GET /v2/agent/{agentId}/executions                          │
    │         │                                                     │
    │         ▼  (for each execution)                               │
    │  Determine direction: call_type == "outbound"?                │
    │    YES → caller_number = to_number (customer dialed)          │
    │    NO  → caller_number = from_number (customer calling in)    │
    │         │                                                     │
    │  Call.findOne({ call_id: exec.id })                           │
    │    EXISTS + bolna_updated_at unchanged → SKIP                 │
    │    EXISTS + bolna_updated_at newer → UPDATE fields only       │
    │                              (userId never overwritten)       │
    │    NOT EXISTS →                                               │
    │      Call.findOneAndUpdate(..., { upsert: true })  [insert]   │
    │      Contact.findOneAndUpdate(phone, {              [upsert]  │
    │        $setOnInsert: { name, tag:"fresh", source },           │
    │        $inc: { call_count: 1, total_call_duration }           │
    │      })                                                       │
    │      Customer.findOneAndUpdate(phone, {             [upsert]  │
    │        $setOnInsert: { name, status:"fresh" },                │
    │        $addToSet: { callDirections }                          │
    │      })  ← Creates CRM record immediately, no LLM needed     │
    └─────────┬─────────────────────────────────────────────────────┘
              │
    ┌─────────▼─────────────────────────────────────────────────────┐
    │  PHASE 3: LLM Analysis                                        │
    │                                                               │
    │  Find up to 5 calls where:                                    │
    │    processed=false, llm_analysis=null, transcript exists      │
    │         │                                                     │
    │         ▼  (for each call, 10s delay between)                 │
    │  analyzeTranscript(transcript)                                │
    │         │                                                     │
    │         ▼                                                     │
    │  LLM returns JSON: { summary, intent, sentiment,             │
    │                      contact_name, booking, ... }             │
    │         │                                                     │
    │  Map intent → status:                                        │
    │    booking.is_booked or intent=="booked" → "purchased"        │
    │    intent=="interested"  → "interested"                       │
    │    intent=="follow_up"   → "follow_up"                        │
    │    intent=="not_interested" → "not_interested"                │
    │         │                                                     │
    │  Call.updateOne → { llm_analysis, processed:true }           │
    │  Contact.findOneAndUpdate → { tag, name, last_call_* }        │
    │  Customer.findOneAndUpdate (upsert) → { status, name,        │
    │                                         pastConversations[] } │
    └─────────┬─────────────────────────────────────────────────────┘
              │
    ┌─────────▼─────────────────────────────────────────────────────┐
    │  PHASE 4: Campaign Status Sync                                 │
    │                                                               │
    │  Find all Campaigns where status NOT IN                       │
    │  [completed, failed, stopped, executed]                       │
    │         │                                                     │
    │         ▼  (for each non-terminal campaign)                   │
    │  GET /batches/{batchId}  →  Bolna API                        │
    │         │                                                     │
    │  Map Bolna status → internal status:                         │
    │    executing/queued → "running"                               │
    │    executed/completed → "completed"                           │
    │    failed → "failed", stopped → "stopped"                     │
    │         │                                                     │
    │  Campaign.updateOne({ status: newStatus })                    │
    └───────────────────────────────────────────────────────────────┘
```

---

## 5. All API Endpoints

### 5.1 Auth Routes — `/api/auth`
> No authentication required

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/auth/google` | Initiate Google OAuth redirect |
| `GET` | `/api/auth/google/callback` | OAuth callback — creates/updates user, sets session |
| `GET` | `/api/auth/me` | Returns current session user data |
| `GET` | `/api/auth/health` | Server + MongoDB connectivity check |
| `POST` | `/api/auth/logout` | Destroys session, clears cookie |

---

### 5.2 Setup Routes — `/api/setup-api`
> Requires: `isAuthenticated`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/setup-api` | Check if user has configured a Bolna API key |
| `POST` | `/api/setup-api` | Validate Bolna API key → AES-256 encrypt → save; starts free trial |

**POST body:** `{ apiKey: string }`

---

### 5.3 Settings Routes — `/api/settings`
> Requires: `isAuthenticated`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/settings` | Masked API key + subscription info + days remaining |
| `PUT` | `/api/settings/bolna-api` | Re-validate and update Bolna API key |

---

### 5.4 Subscription Routes — `/api/subscribe`
> Requires: `isAuthenticated`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/subscribe/config` | Razorpay key + current subscription status |
| `POST` | `/api/subscribe/create-order` | Create Razorpay order (returns orderId + amount) |
| `POST` | `/api/subscribe/verify-payment` | Client-side Razorpay signature verification → activate |
| `POST` | `/api/subscribe/start-trial` | Activate 7-day free trial (or longer with coupon) |

---

### 5.5 CRM Routes — `/api/crm`
> Requires: `isAuthenticated` + `isSubscribed`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/crm` | Paginated customers list — filters: `status`, `direction`, `search`, `page`, `limit` |
| `GET` | `/api/crm/stats` | Count per status: fresh, interested, not_interested, booked, NA, queries, follow_up, sent_quotation |
| `POST` | `/api/crm/sync-bolna` | Manually trigger background sync poller (async, returns immediately) |
| `POST` | `/api/crm` | Create single customer |
| `POST` | `/api/crm/bulk` | CSV bulk upload (max 5MB) — auto-adds `+91` for 10-digit Indian numbers |
| `PUT` | `/api/crm/:id` | Update customer: name, phone, email, status, pastConversations, callDirections |
| `DELETE` | `/api/crm/:id` | Hard delete customer |

**Customer Statuses:** `fresh` · `interested` · `not_interested` · `booked` · `NA` · `queries` · `follow_up` · `sent_quotation`

---

### 5.6 Campaign Routes — `/api/campaigns`
> Requires: `isAuthenticated` + `isSubscribed` (some endpoints also `hasBolnaKey`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/campaigns` | Paginated campaign list (10/page) |
| `GET` | `/api/campaigns/preview` | Preview leads for a given status (no batch created) |
| `GET` | `/api/campaigns/download-csv` | Download Bolna-format CSV for a status |
| `POST` | `/api/campaigns/create` | Build CSV → upload to Bolna batch → save Campaign doc |
| `POST` | `/api/campaigns/:id/schedule` | Schedule a draft campaign with a datetime |
| `POST` | `/api/campaigns/:id/stop` | Stop a running/scheduled campaign |
| `GET` | `/api/campaigns/:id/status` | Get live batch status from Bolna (syncs to DB) |
| `GET` | `/api/campaigns/:id/results` | Get all execution results for a batch |
| `DELETE` | `/api/campaigns/:id` | Delete campaign record |
| `GET` | `/api/campaigns/batch/:batchId/status` | Batch status with humanized timestamps |

---

### 5.7 Bolna Proxy Routes — `/api/bolna`
> Requires: `isAuthenticated` + `isSubscribed` + `hasBolnaKey`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/bolna/agents` | User's Bolna agents (for dropdowns) |
| `GET` | `/api/bolna/phone-numbers` | User's Bolna phone numbers (for dropdowns) |
| `ALL` | `/api/bolna/proxy?endpoint=/...` | Generic Bolna API proxy (actions: stop agent, etc.) |

---

### 5.8 Dashboard Routes — `/api/dashboard`
> Requires: `isAuthenticated` + `isSubscribed`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Aggregated home data: CRM stats, active campaigns, subscription status, recent payments |

---

### 5.9 Call Processor Routes — `/api/*`
> Requires: `isAuthenticated` + `isSubscribed`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/call-history` | Paginated call list from MongoDB — filters: `agent_id`, `status`, `call_type`, `page`, `limit` |
| `GET` | `/api/call-history/agents` | Distinct agents from user's call records |
| `GET` | `/api/call-bookings` | Calls where `is_booked=true` or `intent=interested` |
| `GET` | `/api/call-bookings/:call_id` | Single booking detail |
| `GET` | `/api/queries-calls` | All processed calls with LLM analysis |
| `GET` | `/api/processed-calls` | All analyzed calls — filters: `direction`, `intent` |
| `GET` | `/api/processed-calls/:call_id` | Single processed call detail |
| `GET` | `/api/internal/call-status/:call_id` | Processing status: exists, processed, intent, is_booked, direction |
| `POST` | `/api/internal/process-calls` | Manually trigger sync poller |

---

### 5.10 Contact Routes — `/api/contacts`
> Requires: `isAuthenticated`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/contacts` | Paginated contacts — filters: `tag`, `source`, `search` |
| `GET` | `/api/contacts/:id` | Single contact + full call history |
| `GET` | `/api/contacts/:id/latest-structured-call` | Most recent LLM-analyzed call for this contact |
| `POST` | `/api/contacts` | Create contact manually |
| `PUT` | `/api/contacts/:id` | Update contact |
| `DELETE` | `/api/contacts/:id` | Delete contact |
| `POST` | `/api/contacts/bulk-upload` | CSV bulk upload (multipart form) |

---

### 5.11 Webhook Routes — `/api/webhooks`
> No authentication — raw body for HMAC signature verification

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/razorpay` | Razorpay `payment.captured` event → activate subscription |

---

## 6. MongoDB Models

### User
```
IUser {
  googleId        String (unique)      — Google OAuth subject ID
  name            String
  email           String (unique)
  profileImage    String
  bolnaApiKey     String | null        — AES-256 encrypted
  subscriptionStatus  "inactive" | "trial" | "active" | "expired"
  subscriptionExpiresAt  Date | null
  trialStartedAt  Date | null
  trialExpiresAt  Date | null
  couponApplied   String | null
  isSubscriptionActive  Boolean (virtual)  — checks trial + subscription
}
```

### Agent
```
IAgent {
  userId          String (indexed)     — Tenant ownership key
  bolnaAgentId    String (unique)      — Bolna API agent ID
  agentName       String
  isActive        Boolean
  lastSyncedAt    Date
}
Indexes: { bolnaAgentId: 1 } unique, { userId: 1 }
```

### Call
```
ICall {
  call_id         String (unique)      — Bolna execution ID (dedup key)
  userId          String (indexed)     — From MongoDB Agent doc ONLY
  agent_id        String
  agent_name      String
  batch_id        String | null
  caller_number   String               — Normalized phone (E.164)
  call_duration   Number               — Seconds
  call_timestamp  String               — ISO datetime string
  transcript      String
  call_direction  "inbound" | "outbound" | "unknown"
  total_cost      Number
  recording_url   String
  llm_analysis    LLMAnalysis | null
  processed       Boolean              — Has LLM phase run on this call?
  bolna_updated_at  Date | null        — Change detection timestamp
  synced_at       Date | null
  status          String               — Bolna execution status
}
Indexes: { call_id } unique, { userId, call_id } unique,
         { userId, created_at }, { userId, processed }, { userId, caller_number }
```

### Customer
```
ICustomer {
  userId          ObjectId (indexed)   — Tenant owner
  name            String (required)
  phoneNumber     String (required)    — E.164: +91XXXXXXXXXX
  email           String
  status          Enum:
                    "fresh" | "interested" | "not_interested" | "booked"
                    "NA" | "queries" | "follow_up" | "sent_quotation"
  pastConversations  Array of:
                    { date, summary, summary_en, summary_hi,
                      next_step, sentiment, notes }
  callDirections  Array of "inbound" | "outbound"
  createdAt       Date (auto)
  updatedAt       Date (auto)
}
Indexes: { userId, phoneNumber } unique, { userId, status }, { userId, createdAt }
```

### Contact
```
IContact {
  userId          String (indexed)     — Tenant owner
  name            String (required)
  phone           String               — Normalized E.164
  email           String
  tag             String               — Status label: fresh, purchased, interested...
  source          String               — bolna_inbound | bolna_outbound | csv | pms
  call_count      Number
  total_call_duration  Number          — Seconds
  last_call_date  Date | null
  last_call_summary  String
  last_call_agent  String
  created_at      Date
  updated_at      Date
}
Indexes: { userId, phone } unique, { userId, created_at }, { userId, tag }
```

### Campaign
```
ICampaign {
  userId          ObjectId (indexed)
  agentId         String               — Bolna agent ID
  batchId         String               — Bolna batch ID
  name            String
  status          "draft" | "scheduled" | "running" | "completed" | "failed" | "stopped"
  targetStatus    String               — CRM status filter used to build lead list
  leadCount       Number
  scheduledAt     Date | null
  createdAt       Date (auto)
  updatedAt       Date (auto)
}
```

### Payment
```
IPayment {
  userId          ObjectId
  razorpayOrderId   String
  razorpayPaymentId String | null
  amountPaid      Number               — In paise (₹5 = 500 paise)
  status          "pending" | "success" | "failed"
  periodStart     Date
  periodEnd       Date
  createdAt       Date
}
```

---

## 7. Frontend → Backend API Map

```
Page / Component                API Call(s)
──────────────────────────────────────────────────────────────────────────
Dashboard                       GET /api/dashboard
                                GET /api/crm/stats

Customers (/customers)          GET /api/crm (paginated + filters)
                                GET /api/crm/stats
                                POST /api/crm (add lead)
                                PUT  /api/crm/:id (edit lead)
                                DELETE /api/crm/:id (delete lead)
                                POST /api/crm/bulk (CSV upload)
                                POST /api/crm/sync-bolna (manual sync)

Call History (/call-history)    GET /api/call-history (paginated + filters)
                                GET /api/call-history/agents (agent dropdown)

Bookings (/bookings)            GET /api/call-bookings
                                GET /api/call-bookings/:call_id

Contacts (/contacts)            GET /api/contacts (paginated + filters)
                                GET /api/contacts/:id
                                PUT  /api/contacts/:id
                                DELETE /api/contacts/:id
                                POST /api/contacts/bulk-upload

Campaigns (/campaigns)          GET /api/campaigns
                                POST /api/campaigns/create
                                POST /api/campaigns/:id/schedule
                                POST /api/campaigns/:id/stop
                                GET /api/campaigns/:id/status
                                GET /api/campaigns/preview?status=...
                                GET /api/campaigns/download-csv?status=...
                                DELETE /api/campaigns/:id

AI Agents (/agents)             GET /api/bolna/agents
                                GET /api/bolna/phone-numbers
                                (Voice builder via FastAPI proxy /api/agents)

Billing (/billing)              GET /api/subscribe/config
                                POST /api/subscribe/create-order
                                POST /api/subscribe/verify-payment

Settings (/settings)            GET /api/settings
                                PUT /api/settings/bolna-api

Setup (/setup)                  GET /api/setup-api
                                POST /api/setup-api

Login (/login)                  GET /api/auth/google (redirect)
                                GET /api/auth/me (session check)
```

---

## 8. Subscription & Payment Flow

```
User on Billing page
        │
        ▼
GET /api/subscribe/config
        │  returns: { razorpayKeyId, subscriptionStatus, daysRemaining }
        ▼
User clicks "Subscribe" (₹5/month)
        │
        ▼
POST /api/subscribe/create-order
        │  Razorpay.orders.create({ amount: 500, currency: "INR" })
        │  → save Payment doc (status: "pending")
        │  returns: { orderId, amount, currency }
        ▼
Razorpay checkout opens in browser
        │
        ▼  (user completes payment)
        │
        ├──── PATH A: Client-side verification ─────────────────────────────┐
        │                                                                   │
        │  POST /api/subscribe/verify-payment                               │
        │  { razorpay_order_id, razorpay_payment_id, razorpay_signature }   │
        │         │                                                         │
        │  HMAC-SHA256 verify signature                                     │
        │         │                                                         │
        │  activateSubscription(userId, orderId, paymentId)                 │
        │    → Payment.updateOne({ status: "success" })                     │
        │    → User.updateOne({ subscriptionStatus: "active",               │
        │                        subscriptionExpiresAt: now + 30 days })    │
        │                                                                   │
        └───────────────────────────────────────────────────────────────────┘
        │
        └──── PATH B: Razorpay Webhook (server-side, more reliable) ────────┐
                                                                            │
          POST /api/webhooks/razorpay  (raw body)                          │
          event: "payment.captured"                                         │
                 │                                                          │
          HMAC-SHA256 verify with RAZORPAY_WEBHOOK_SECRET                  │
                 │                                                          │
          activateSubscription(userId, orderId, paymentId)                 │
          (same function as Path A — idempotent)                            │
                                                                            │
          └───────────────────────────────────────────────────────────────┘

Free Trial:
  POST /api/subscribe/start-trial  (or auto-started on first API key setup)
    → User.updateOne({ subscriptionStatus: "trial",
                        trialStartedAt: now,
                        trialExpiresAt: now + 7 days })
```

---

## 9. Tenant Isolation

Every user's data is completely isolated. Here's how it works end-to-end:

```
1. User authenticates → session stores user._id

2. Request arrives → attachTenantContext middleware:
     req.tenantId = req.user._id.toString()

3. Every route query uses:
     Customer.find({ userId: req.tenantId, ... })
     Call.find({ userId: req.tenantId, ... })
     Contact.find({ userId: req.tenantId, ... })

4. tenantPlugin (applied to all models):
     pre('find') / pre('findOne') / etc.
     → auto-injects { userId: currentTenantId }
     → enforcement mode: "soft" (warn) or "strict" (reject query)

5. Background Poller:
     userId comes ONLY from MongoDB Agent doc
     → never from Bolna API response
     → bolt: this rule ensures a compromised Bolna account
              cannot leak data across tenants

6. Database indexes enforce uniqueness per-tenant:
     { userId, phoneNumber } — unique per Customer
     { userId, phone }       — unique per Contact
     { userId, call_id }     — unique per Call
```

**Critical Rule:** `userId` is **never overwritten** on existing Call records. Only set on insert.

---

## 10. LLM Analysis Service

The `llmService.ts` is called in Poller Phase 3 to extract structured data from call transcripts.

### Provider Auto-Detection

```
GROK_API_KEY set?           → Grok (xAI)    api.x.ai/v1
GROQ API key (prefix gsk_)  → Groq           api.groq.com/openai/v1
Gemini key (prefix AIza)    → Gemini         generativelanguage.googleapis.com
```

| Provider | Endpoint | Model |
|----------|----------|-------|
| Grok (xAI) | `https://api.x.ai/v1/chat/completions` | `grok-3-mini` |
| Groq | `https://api.groq.com/openai/v1/chat/completions` | `llama-3.1-8b-instant` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | `gemini-1.5-flash` |

### Output Schema

```typescript
LLMAnalysis {
  summary:         string        // English call summary
  summary_en:      string        // Mirror of summary
  summary_hi:      string        // Hindi summary
  intent:          "queries" | "booked" | "not_interested"
  next_step:       string        // Recommended follow-up action
  sentiment:       "positive" | "neutral" | "negative"
  contact_name:    string | null // Customer name detected in transcript
  customer_name:   string | null // Mirror of contact_name (legacy)
  call_direction:  "inbound" | "outbound"
  booking: {
    is_booked:          boolean
    date:               "YYYY-MM-DD" | null
    time:               "HH:MM" | null
    raw_datetime_string: string | null
  }
}
```

### Intent → Customer Status Mapping

```
LLM intent          →    Customer.status / Contact.tag
─────────────────────────────────────────────────────
booking.is_booked=true   "purchased" (Contact) / "booked" (Customer)
intent="booked"          "purchased" (Contact) / "booked" (Customer)
intent="interested"      "interested"
intent="follow_up"       "follow_up"
intent="not_interested"  "not_interested"
(otherwise)              remains "fresh"
```

**Rate limiting:** 10-second delay between LLM calls per poller run. Maximum 5 calls per run.

---

## 11. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `SESSION_SECRET` | ✅ | Express session encryption key (use random 64-char string) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | ✅ | OAuth redirect URI (e.g. `https://yourdomain.com/api/auth/google/callback`) |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay public key |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay secret key |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Razorpay webhook signature secret |
| `GROK_API_KEY` | ⚠️ | Grok (xAI) API key — or use GROQ/Gemini instead |
| `GEMINI_API_KEY` | ⚠️ | Gemini API key (if not using Grok/Groq) |
| `POLLER_INTERVAL_MS` | ➡️ | Background sync interval in ms (default: `300000` = 5 min) |
| `TENANT_ENFORCEMENT` | ➡️ | `"soft"` (log warnings) or `"strict"` (reject un-scoped queries) |
| `NODE_ENV` | ➡️ | `"production"` or `"development"` |
| `PORT` | ➡️ | Server port (default: `5000`) |

> ⚠️ At least one LLM key is required for transcript analysis to work.
> ➡️ Optional with sensible defaults.
