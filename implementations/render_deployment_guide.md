# 🚀 Bolna Dashboard — Render Deployment Guide

> Deploy as a **single unified Web Service** — Express serves both API + React frontend.

---

## 📊 Architecture

```
         Browser (Users)
              │
    ┌─────────▼──────────┐
    │  Render Web Service │
    │  (Node.js)          │
    │                     │
    │  server/index.ts    │
    │  ├── /api/*  → API  │
    │  └── /*     → React │
    └─────────┬───────────┘
              │
    ┌─────────▼───────────┐
    │  MongoDB Atlas       │
    │  (Cloud Database)    │
    └──────────────────────┘
```

> [!IMPORTANT]
> **Do NOT split into two services** (backend + static site). The auth system uses server-side sessions — splitting breaks `/api/auth/me` because the static site rewrites all requests to `index.html`.

---

## Step 1 — Push Code to GitHub

Make sure your latest code is pushed:

```bash
git add .
git commit -m "Production ready"
git push origin main
```

Make sure `.env` is in `.gitignore` (never commit secrets).

---

## Step 2 — Create a Web Service on Render

1. Go to [render.com](https://render.com) → **Dashboard** → **New** → **Web Service**
2. Connect your **GitHub repo**
3. Configure these settings:

| Setting | Value |
|---|---|
| **Name** | `bolna-crm` (or whatever you want) |
| **Region** | Oregon or Singapore (closest to your users) |
| **Root Directory** | _(leave blank)_ |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx tsx server/index.ts` |
| **Instance Type** | **Starter ($7/mo)** — Free tier sleeps after 15 min, kills your scheduler |

4. Click **Create Web Service** (don't add env vars yet — do that in Step 3)

---

## Step 3 — Add Environment Variables

Go to your service → **Environment** tab → **Add Environment Variable**

Add each one:

| Key | Value | Where to get it |
|---|---|---|
| `NODE_ENV` | `production` | Just type it |
| `PORT` | `5000` | Just type it |
| `MONGODB_URI` | `mongodb+srv://...` | [cloud.mongodb.com](https://cloud.mongodb.com) → Connect |
| `SESSION_SECRET` | Random 64-char hex | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | `456216...apps.googleusercontent.com` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Same place |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-SERVICE.onrender.com/api/auth/google/callback` | Your Render URL + path |
| `ENCRYPTION_KEY` | Random 64-char hex | Generate same as SESSION_SECRET |
| `GROK_API_KEY` | `gsk_...` | [console.groq.com](https://console.groq.com) |
| `RAZORPAY_KEY_ID` | `rzp_test_...` or `rzp_live_...` | [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret | Same place |
| `RAZORPAY_WEBHOOK_SECRET` | Your webhook secret | Razorpay → Webhooks |
| `BASE_PLAN_PRICE` | `349900` | Price in paise (₹3,499) |

> After adding all vars, Render will **auto-restart** the service.

---

## Step 4 — Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click on your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   ```
   https://YOUR-SERVICE.onrender.com/api/auth/google/callback
   ```
4. Click **Save**

> [!IMPORTANT]
> The callback URL must **exactly match** what you put in `GOOGLE_CALLBACK_URL` env var — including `https://` and the path.

---

## Step 5 — Whitelist Render in MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access**
2. Click **Add IP Address**
3. Add `0.0.0.0/0` (Allow from anywhere)
   - Render uses dynamic IPs, so you can't whitelist a specific IP
   - Your MongoDB password protects access

---

## Step 6 — Set Up Razorpay Webhook

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com) → **Settings** → **Webhooks**
2. Click **Add New Webhook**
3. Fill in:

| Field | Value |
|---|---|
| **Webhook URL** | `https://YOUR-SERVICE.onrender.com/api/webhooks/razorpay` |
| **Secret** | Same value as your `RAZORPAY_WEBHOOK_SECRET` env var |
| **Active Events** | ✅ `payment.captured` |

4. Click **Create Webhook**

---

## Step 7 — Verify Deployment

### 7a. Check Service is Running
- Render Dashboard → your service → **Logs** tab
- Look for: `serving on port 5000`
- Look for: `[MongoDB] Connected`
- Look for: `[AutoPoll] Starting polling every 300s`

### 7b. Test Health Check
Visit in browser:
```
https://YOUR-SERVICE.onrender.com/api/auth/health
```
Should return:
```json
{ "status": "ok", "db": "connected", "timestamp": "..." }
```

### 7c. Test the Full Flow
1. Visit `https://YOUR-SERVICE.onrender.com`
2. Click **Sign in with Google**
3. Should redirect to setup/subscribe/dashboard based on your account state
4. Go to `/subscribe` → test a payment with test card `4111 1111 1111 1111`

---

## Step 8 — If You Had the Old Two-Service Setup

If you previously deployed as two separate services (backend + static site):

1. **Delete** the Static Site (`bolna-dashboard`) from Render
2. **Update** the existing Web Service:
   - Build Command → `npm install && npm run build`
   - Start Command → `npx tsx server/index.ts`
3. Add any missing env vars from Step 3
4. **Trigger a manual deploy** → go to service → **Manual Deploy** → **Deploy latest commit**

---

## ✅ Post-Deployment Checklist

| Task | How to verify |
|---|---|
| ✅ Site loads | Visit `https://YOUR-SERVICE.onrender.com` |
| ✅ Health check passes | Visit `/api/auth/health` → `{"status":"ok","db":"connected"}` |
| ✅ Google OAuth works | Click "Sign in with Google" |
| ✅ Dashboard loads after login | Navigate to `/dashboard` |
| ✅ Razorpay payment works | Go to `/subscribe` → test payment |
| ✅ Scheduler is running | Check logs for `[AutoPoll]` messages |
| ✅ No auth errors | No `<!DOCTYPE` errors in browser console |

---

## 🧯 Troubleshooting

| Problem | Fix |
|---|---|
| **`<!DOCTYPE` auth error** | You're running two services. Switch to single service (this guide). |
| **502 Bad Gateway** | Service crashed. Check **Logs** tab. Usually a missing env var. |
| **Google OAuth fails** | `GOOGLE_CALLBACK_URL` must exactly match Google Cloud Console redirect URI. |
| **Razorpay fails** | Check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in env vars. |
| **MongoDB won't connect** | Check Atlas Network Access → `0.0.0.0/0` must be whitelisted. |
| **Service sleeps** | Free tier sleeps after 15 min. Upgrade to Starter ($7/mo). |
| **Build fails** | Check that `npm run build` works locally first. |
| **Scheduler not running** | Only runs on always-on instances (Starter+). Free tier kills it. |

---

## 💰 Render Cost

| Plan | Monthly | Always-on? | Good for |
|---|---|---|---|
| **Free** | $0 | ❌ Sleeps after 15 min | Quick demo only |
| **Starter** | $7 | ✅ Yes | Production (1-10 users) |
| **Standard** | $25 | ✅ Yes | Production (10-50 users) |

+ MongoDB Atlas M0: **Free** (512MB, good for up to ~20 users)
