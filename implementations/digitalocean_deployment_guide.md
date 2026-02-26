# 🚀 Bolna Dashboard — DigitalOcean Deployment Guide

> Deploy your Bolna AI CRM on **DigitalOcean**. You have two options:
> **Option A:** App Platform (PaaS, exactly like Render, auto-deploys from GitHub)
> **Option B:** Droplet (VPS, exactly like Hostinger, manual setup)

This guide focuses on **Option A: App Platform**, as it is the most stable, zero-maintenance, and scalable way to host a Node.js + React unified service.

---

## 📊 Architecture Overview (App Platform)

```text
         Browser (Users)
              │
    ┌─────────▼───────────┐
    │ DigitalOcean App    │
    │ Platform (Node.js)  │
    │                     │
    │  server/index.ts    │
    │  ├── /api/*  → API  │
    │  └── /*     → React │
    └─────────┬───────────┘
              │
    ┌─────────▼───────────┐
    │  MongoDB Atlas      │
    │  (Cloud Database)   │
    └─────────────────────┘
```

> [!IMPORTANT]
> **We deploy as a single unified service**. The Express backend serves the API and also statically serves the compiled React frontend `dist/` folder. This is required for Google OAuth sessions to work correctly.

---

## Step 1 — Push Code to GitHub

Make sure your latest code is pushed to your GitHub repository:

```bash
git add .
git commit -m "Production ready for DO"
git push origin main
```

*(Ensure `.env` is safely inside `.gitignore` and not pushed to GitHub).*

---

## Step 2 — Create App on DigitalOcean

1. Go to [DigitalOcean Dashboard](https://cloud.digitalocean.com)
2. Click **Create** (top right) → **Apps** (App Platform).
3. **Choose Source:** Select **GitHub** and authorize DigitalOcean.
4. Select your `bolna-dashboard` repository and the `main` branch.
5. **Source Directory:** Leave as `/` (root).
6. Click **Next**.

### Configure the Component

DigitalOcean will auto-detect it as a **Web Service** (Node.js). Click on the component to edit its settings:

| Setting | Value |
|---|---|
| **Name** | `bolna-crm` |
| **HTTP Port** | `5000` |
| **Build Command** | `npm install && npm run build` |
| **Run Command** | `npx tsx server/index.ts` |

Click **Next**.

---

## Step 3 — Add Environment Variables

In the **Environment Variables** step, add all your production variables. 
Click **Bulk Edit** and paste your `.env` securely, or add them one by one:

| Key | Value | Where to get it |
|---|---|---|
| `NODE_ENV` | `production` | Just type it |
| `PORT` | `5000` | Just type it |
| `MONGODB_URI` | `mongodb+srv://...` | [cloud.mongodb.com](https://cloud.mongodb.com) |
| `SESSION_SECRET` | Random 64-char string | Generate yourself |
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com`| [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Same place |
| `GOOGLE_CALLBACK_URL` | `https://YOUR-APP.ondigitalocean.app/api/auth/google/callback` | (Update this after deployment when you get the DO URL, or use a custom domain) |
| `ENCRYPTION_KEY` | Random 64-char string | Generate yourself |
| `GROK_API_KEY` | `gsk_...` | [console.groq.com](https://console.groq.com) |
| `RAZORPAY_KEY_ID` | `rzp_live_...` | [Razorpay Dashboard](https://dashboard.razorpay.com) |
| `RAZORPAY_KEY_SECRET` | Your Razorpay secret | Same place |
| `RAZORPAY_WEBHOOK_SECRET` | Your webhook secret | Razorpay → Webhooks |
| `BASE_PLAN_PRICE` | `349900` | Price in paise (₹3,499) |

Click **Next**.

---

## Step 4 — Choose a Plan & Deploy

1. **Plan Size:** Select the **Basic Plan** ($5/mo for 512MB RAM, or $10/mo for 1GB RAM). 
   - *Note: 512MB is fine for starting out. If the build runs out of memory, bump it to 1GB during build, or permanently.*
2. **Region:** Choose the region closest to your customers (e.g., **Bangalore** for India).
3. Click **Create Resources**.

DigitalOcean will now build and deploy your app. This takes about 3-5 minutes.

---

## Step 5 — Post-Deployment Integrations

Once the app is live, DigitalOcean will give you an `*.ondigitalocean.app` domain (or you can attach your custom domain in the **Settings → Domains** tab).

### 5a. Update Google OAuth
1. Go to Google Cloud Console.
2. Edit your OAuth Client ID.
3. Under **Authorized redirect URIs**, add your DO URL:
   `https://YOUR-APP.ondigitalocean.app/api/auth/google/callback`

### 5b. Update Razorpay Webhooks
1. Go to Razorpay Dashboard → **Account & Settings** → **Webhooks**.
2. Add the DO URL to the webhook configuration:
   `https://YOUR-APP.ondigitalocean.app/api/webhooks/razorpay`

### 5c. Whitelist IPs in MongoDB Atlas
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) → **Network Access**.
2. Since App Platform uses dynamic outbound IPs, you must whitelist `0.0.0.0/0` (Allow from anywhere) and rely on your strong MongoDB password for security.

---

## ✅ Verification Checklist

Ensure everything is running smoothly:

| Task | How to verify |
|---|---|
| ✅ Site loads | Visit your provided `.ondigitalocean.app` URL |
| ✅ Health check passes | Visit `/api/auth/health` → `{"status":"ok","db":"connected"}` |
| ✅ Google OAuth works | Try logging in |
| ✅ Razorpay works | Initiate a test payment |
| ✅ Background Polling | Go to the App Platform **Runtime Logs** and look for `[AutoPoll] Starting polling every 300s` |

---

## 💻 Option B: Deploying on a DigitalOcean Droplet (VPS)

If you prefer to have a dedicated server (like the Hostinger method) to save costs at high scale:

1. **Create Droplet:** Choose **Ubuntu 22.04**, $4/mo or $6/mo Basic Droplet, Bangalore region.
2. **Access via SSH:** `ssh root@YOUR_DROPLET_IP`
3. **Follow the Hostinger Guide:** The commands are **100% identical** to the existing `hostinger_vps_deployment_guide.md`. You will manually install Node.js, PM2, and Nginx, clone the repo, and set up reverse proxy.

---

## ⚖️ DigitalOcean App Platform vs. Droplet

| Feature | DO App Platform (Option A) | DO Droplet (Option B) |
|---|---|---|
| **Best for** | Fast deployment, zero maintenance | Highest performance per dollar |
| **Cost** | $5 - $12 / month | $4 - $6 / month |
| **Setup time** | 5 minutes | 30-45 minutes |
| **Deploys** | Auto-deploys on `git push` | Manual `git pull && pm2 restart` |
| **SSL** | Handled automatically | Manual (`certbot`) |
| **Similar to** | Render | Hostinger VPS |

**Recommendation:** Start with **DigitalOcean App Platform**. It shares the same zero-devops philosophy as Render, but their pricing scales much more smoothly and they offer datacenters in India (Bangalore) for lower latency.
