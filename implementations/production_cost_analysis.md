# 💰 Bolna Dashboard — Production Cost Analysis

> Based on analysis of your codebase: React/Vite frontend, Express.js backend, MongoDB, Bolna Voice AI, LLM transcript analysis (Grok/Groq/Gemini), Google OAuth, Razorpay payments.

---

## 📊 System Architecture Summary

| Component | Technology | Cost Driver |
|---|---|---|
| **Frontend** | React + Vite (static build) | Hosting bandwidth |
| **Backend** | Express.js (Node.js) | Compute (always-on for scheduler) |
| **Database** | MongoDB (Mongoose) | Storage + connections |
| **Auth** | Google OAuth + Passport | Free (Google) |
| **Payments** | Razorpay | Transaction fee per payment |
| **Voice AI** | Bolna API | Per-minute call cost |
| **LLM Analysis** | Grok / Groq / Gemini | Per-token cost per transcript |
| **Background Jobs** | Scheduler (5-min polling) | Needs always-on server |

> [!IMPORTANT]
> Your system uses a **5-minute polling scheduler** ([scheduler.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/services/scheduler.ts)) that loops through all active users. This means you **cannot use a pure serverless/Lambda architecture** without redesigning the polling into a cron-triggered function. More on this below.

---

## 1️⃣ API Costs (Variable — Based on Usage)

### 🔊 Bolna Voice AI API

Bolna charges per-minute of voice call time. Your system polls their API and stores `total_cost` and `cost_breakdown` (LLM, network, TTS, ASR) per execution.

| Scale | Calls/Month | Avg Duration | Est. Bolna Cost/Month |
|---|---|---|---|
| **Small** (1-5 users, startup) | ~500 calls | 2 min avg | **$50 – $150** |
| **Medium** (10-25 users) | ~5,000 calls | 2 min avg | **$500 – $1,500** |
| **Large** (50+ users) | ~25,000+ calls | 2 min avg | **$2,500 – $7,500+** |

> [!NOTE]
> Bolna pricing varies by provider (telephony, TTS, ASR, LLM choices configured per agent). Check [Bolna pricing page](https://bolna.ai/pricing) for exact per-minute rates. Typical range: **$0.05 – $0.15/min**.

---

### 🧠 LLM API (Transcript Analysis)

Your [llmService.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/services/llmService.ts) calls one of three LLM providers for every new call transcript. It uses a single system prompt + user message pattern.

| Provider | Model | Input Cost | Output Cost | Cost per Transcript (~1000 tokens) |
|---|---|---|---|---|
| **Grok (xAI)** | `grok-3-mini` | $0.30/1M tokens | $0.50/1M tokens | **~$0.0008** |
| **Groq** | `llama-3.1-8b-instant` | $0.05/1M tokens | $0.08/1M tokens | **~$0.00013** ✨ Cheapest |
| **Gemini** | `gemini-1.5-flash` | $0.075/1M tokens | $0.30/1M tokens | **~$0.0004** |

| Scale | Transcripts/Month | Grok Cost | Groq Cost | Gemini Cost |
|---|---|---|---|---|
| **Small** (500 calls) | 500 | **$0.40** | **$0.07** | **$0.20** |
| **Medium** (5,000 calls) | 5,000 | **$4.00** | **$0.65** | **$2.00** |
| **Large** (25,000 calls) | 25,000 | **$20.00** | **$3.25** | **$10.00** |

> [!TIP]
> **Use Groq** (`llama-3.1-8b-instant`) for production. It's the cheapest by 6x and fastest. Your code already supports it via auto-detection (`gsk_` prefix). LLM costs are negligible at any scale.

---

### 💳 Razorpay (Payment Gateway)

| Fee Type | Rate |
|---|---|
| **Standard Transaction Fee** | 2% per transaction |
| **Your Plan Price** | ₹4,000/month (from `BASE_PLAN_PRICE=400000` paise) |
| **Razorpay Fee per Payment** | ~₹80/transaction |

| Scale | Paying Users | Monthly Revenue | Razorpay Fees |
|---|---|---|---|
| **Small** (5 users) | 5 | ₹20,000 | **~₹400** (~$5) |
| **Medium** (25 users) | 25 | ₹1,00,000 | **~₹2,000** (~$24) |
| **Large** (100 users) | 100 | ₹4,00,000 | **~₹8,000** (~$96) |

---

### 🔐 Google OAuth

| Item | Cost |
|---|---|
| Google Cloud OAuth (up to 100 users in test) | **Free** |
| Google Cloud OAuth (verified app, production) | **Free** (no per-request cost) |
| OAuth Consent Screen verification | **One-time review** (free for basic apps) |

---

## 2️⃣ Infrastructure Costs (Fixed — Based on Tier)

### Option A: Deploy on Render

> [!IMPORTANT]
> **Render is the recommended choice** for your architecture because your scheduler needs an always-on process. Render's Web Service provides this out of the box.

#### Render Architecture
```
┌─────────────────────────────┐
│  Render Web Service (Node)  │ ← Express Backend + Scheduler
│  Serves API + Static React  │
└────────────┬────────────────┘
             │
     ┌───────┴───────┐
     │  MongoDB Atlas │ ← External managed DB
     └───────────────┘
```

| Component | Render Plan | Monthly Cost |
|---|---|---|
| **Web Service** (Backend + Frontend) | Starter ($7) or Standard ($25) | **$7 – $25** |
| **MongoDB Atlas** (M0 Free → M10) | Free tier → M10 | **$0 – $57** |
| **Custom Domain + SSL** | Included free | **$0** |
| **Bandwidth** | 100 GB free, then $0.10/GB | **$0 – $10** |

**Render Total by Scale:**

| Scale | Web Service | MongoDB Atlas | Total Monthly | Total Yearly |
|---|---|---|---|---|
| **Small** (1-5 users) | $7 (Starter) | $0 (M0 Free, 512MB) | **$7/mo** | **$84/yr** |
| **Medium** (10-25 users) | $25 (Standard) | $30 (M10, 10GB) | **$55/mo** | **$660/yr** |
| **Large** (50+ users) | $85 (Pro) | $57 (M20, 20GB) | **$142/mo** | **$1,704/yr** |

> [!TIP]
> Render's **Starter plan at $7/mo** is perfect for MVP/early production. It includes auto-deploy from Git, zero-downtime deploys, free SSL, and always-on process for your scheduler.

---

### Option B: Deploy on AWS (Lambda + Friends)

> [!WARNING]
> Your current architecture **cannot run on Lambda as-is**. Lambda is stateless and event-driven — your `setInterval` scheduler in [scheduler.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/services/scheduler.ts) won't work. You'd need to refactor into:
> - **Lambda function** for API routes
> - **EventBridge (CloudWatch Events)** for the 5-min polling cron
> - **API Gateway** for HTTP routing
> This adds significant complexity.

#### AWS Architecture (if refactored)
```
┌──────────────────┐     ┌──────────────────┐
│  CloudFront CDN  │     │  EventBridge Rule │
│  (Static React)  │     │  (every 5 min)    │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
┌────────▼─────────┐     ┌───────▼───────────┐
│  API Gateway     │     │  Lambda (Poller)   │
└────────┬─────────┘     └───────┬───────────┘
         │                       │
┌────────▼─────────┐     ┌──────▼────────────┐
│  Lambda (API)    │     │  MongoDB Atlas     │
└────────┬─────────┘     └───────────────────┘
         │
┌────────▼─────────┘
│  MongoDB Atlas    │
└───────────────────┘
```

| Component | AWS Service | Monthly Cost |
|---|---|---|
| **API Routes** | Lambda (free tier: 1M req/mo) | **$0 – $5** |
| **HTTP Routing** | API Gateway (free tier: 1M calls/mo) | **$0 – $3.50** |
| **Frontend CDN** | CloudFront + S3 | **$1 – $5** |
| **Scheduler** | EventBridge (free) + Lambda | **$0** |
| **MongoDB** | Atlas M0 Free → M10 | **$0 – $57** |
| **Secrets Management** | AWS Secrets Manager | **$0.40/secret/mo** |
| **SSL/Domain** | ACM + Route53 | **$0.50/zone** |

**AWS Total by Scale:**

| Scale | Compute | DB | Extras | Total Monthly | Total Yearly |
|---|---|---|---|---|---|
| **Small** (1-5 users) | $0 (free tier) | $0 (M0) | $2 | **~$2/mo** | **~$24/yr** |
| **Medium** (10-25 users) | $5 | $30 (M10) | $5 | **~$40/mo** | **~$480/yr** |
| **Large** (50+ users) | $15 | $57 (M20) | $10 | **~$82/mo** | **~$984/yr** |

> [!CAUTION]
> AWS free tier expires after 12 months for many services. The "Small" tier costs will jump to ~$15-20/mo after year one.

---

## 3️⃣ Total Production Cost Summary

### 💡 Recommended: Render + Groq (Simplest & Cheapest)

| Scale | Infra (Render) | Bolna API | LLM (Groq) | Razorpay | **Total Monthly** | **Total Yearly** |
|---|---|---|---|---|---|---|
| **Small** (5 users, 500 calls) | $7 | $100 | $0.07 | $5 | **~$112/mo** | **~$1,344/yr** |
| **Medium** (25 users, 5K calls) | $55 | $750 | $0.65 | $24 | **~$830/mo** | **~$9,960/yr** |
| **Large** (100 users, 25K calls) | $142 | $3,750 | $3.25 | $96 | **~$3,991/mo** | **~$47,892/yr** |

### AWS Lambda Path (After Refactoring)

| Scale | Infra (AWS) | Bolna API | LLM (Groq) | Razorpay | **Total Monthly** | **Total Yearly** |
|---|---|---|---|---|---|---|
| **Small** (5 users, 500 calls) | $2 | $100 | $0.07 | $5 | **~$107/mo** | **~$1,284/yr** |
| **Medium** (25 users, 5K calls) | $40 | $750 | $0.65 | $24 | **~$815/mo** | **~$9,780/yr** |
| **Large** (100 users, 25K calls) | $82 | $3,750 | $3.25 | $96 | **~$3,931/mo** | **~$47,172/yr** |

---

## 4️⃣ Key Insight: Where Does Your Money Go?

```
📊 Cost Distribution (Medium Scale)

  Bolna Voice AI  ████████████████████████████████████  90%
  Infrastructure  ████████                               7%
  Razorpay Fees   ██                                     3%
  LLM Analysis    ▏                                     <0.1%
```

> [!IMPORTANT]
> **~90% of your production cost is Bolna API usage.** Infrastructure and LLM costs are almost negligible. Your pricing strategy (₹4,000/user/month) should be designed around Bolna's per-minute pricing to maintain healthy margins.

---

## 5️⃣ My Recommendation

| Decision | Recommendation | Why |
|---|---|---|
| **Deployment** | **Render** (Starter → Standard) | Zero refactoring needed, always-on process for scheduler, simple Git deploy |
| **LLM Provider** | **Groq** (`llama-3.1-8b-instant`) | 6x cheaper than Grok, fastest inference, already supported in your code |
| **Database** | **MongoDB Atlas** (start on M0 Free) | Managed, auto-scaling, free tier for MVP |
| **Avoid** | AWS Lambda (for now) | Requires significant refactoring of scheduler architecture |

### 🚀 Day-1 Production Cost (MVP)

| Item | Monthly |
|---|---|
| Render Starter | $7 |
| MongoDB Atlas M0 | $0 |
| Groq LLM | ~$0 |
| Google OAuth | $0 |
| **Total (before Bolna usage)** | **$7/mo** |

Your actual cost is essentially **$7/month + Bolna per-minute usage**. Everything else is either free or pennies.

---

## 6️⃣ Cost Optimization Tips

1. **Cache Bolna API responses** — Your [Call](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/backend/services/callPoller.ts#63-77) model already stores processed calls. Ensure no duplicate processing.
2. **Batch LLM calls** — Your `MAX_CALLS_PER_BATCH = 10` and `DELAY_BETWEEN_CALLS_MS = 10_000` are good rate-limit protections.
3. **Only poll active users** — Your scheduler already filters by `subscriptionStatus: "active"` ✅
4. **Use Groq over Grok** — Switch your [.env](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/.claude/worktrees/jolly-tharp/.env) to a `gsk_` prefixed key for 6x savings.
5. **MongoDB indexing** — Add indexes on `call_id`, `userId`, and `caller_number` for query performance at scale.
6. **Move to Render Standard ($25)** when you hit 10+ paying users — the margins easily cover it at ₹4,000/user.
