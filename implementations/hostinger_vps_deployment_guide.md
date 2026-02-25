# 🚀 Bolna Dashboard — Hostinger VPS Deployment Guide

> Deploy your Bolna AI CRM on **Hostinger KVM 1 VPS** (Ubuntu 22.04, 4GB RAM, 50GB SSD)
> Using **MongoDB Atlas** (cloud) — no local MongoDB needed

---

## 📊 Architecture Overview

```
                     ┌─── Internet ───┐
                     │                │
               ┌─────▼──────┐   ┌────▼──────────────┐
               │  Browser   │   │ Razorpay Webhooks  │
               │  (Users)   │   │ Bolna Callbacks    │
               └─────┬──────┘   └────┬──────────────┘
                     │               │
         ┌───────────▼───────────────▼───────────┐
         │      Nginx (Reverse Proxy + SSL)      │
         │      Port 80/443 → localhost:5000     │
         └───────────────┬───────────────────────┘
                         │
         ┌───────────────▼───────────────────────┐
         │      Node.js (PM2 Managed)            │
         │                                        │
         │  ┌──────────────────────────────────┐ │
         │  │  server/index.ts (Express)        │ │
         │  │  ├── API Routes (/api/*)          │ │
         │  │  ├── Static React Files (/*)      │ │
         │  │  └── Background Scheduler (5min)  │ │
         │  └──────────────┬───────────────────┘ │
         └─────────────────│─────────────────────┘
                           │         Hostinger KVM 1
                           │         Ubuntu 22.04 | 4GB RAM
                    ┌──────▼──────────────┐
                    │  MongoDB Atlas      │
                    │  (Cloud - M0 Free)  │
                    └─────────────────────┘
```

---

## 📋 What You Need From the Client (Before Deploying)

> [!IMPORTANT]
> **Collect ALL of these from the client BEFORE you start deployment.** Send them this checklist.

### 🔴 Must-Have (Deployment will fail without these)

| # | Item | Where client gets it | Example |
|---|---|---|---|
| 1 | **Domain name** | Client buys this (GoDaddy, Namecheap, etc.) | `app.clusterx.in` |
| 2 | **DNS access** | Domain registrar dashboard | To point A record to VPS IP |
| 3 | **Hostinger VPS** (or you buy for them) | [hostinger.in/vps-hosting](https://www.hostinger.in/vps-hosting) | KVM 1 plan |
| 4 | **Google OAuth credentials** | [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) | Client ID + Secret |
| 5 | **Razorpay account (KYC done)** | [dashboard.razorpay.com](https://dashboard.razorpay.com) | Key ID + Secret + Webhook Secret |
| 6 | **MongoDB Atlas cluster** | [cloud.mongodb.com](https://cloud.mongodb.com) | Connection string (`mongodb+srv://...`) |
| 7 | **Bolna API Key** | [bolna.ai](https://bolna.ai) | For their agents |
| 8 | **LLM API Key** (Groq recommended) | [console.groq.com](https://console.groq.com) | Starts with `gsk_` |

### 🟡 Optional (Can be set up later)

| # | Item | Notes |
|---|---|---|
| 9 | **Client's business name** | For the Razorpay checkout popup |
| 10 | **Client's support email** | For the subscribe page / footer |
| 11 | **Logo / Branding** | If customizing the UI |

### 💬 Quick Message Template for Client

> *"Hi [Client], to deploy your CRM I'll need these from your side:*
> 1. *A domain name (e.g., `app.yourbrand.in`)*
> 2. *Razorpay account — sign up at razorpay.com and complete KYC (takes 1-3 days)*
> 3. *Google Cloud project — I'll need Client ID & Secret (I can set this up for you if you share access)*
> 4. *Bolna account — sign up and get your API key*
> 5. *MongoDB Atlas — I can set this up, or share your connection string if you have one*"

---

## Step 0 — Buy & Access the VPS

1. Purchase **KVM 1** from [Hostinger VPS](https://www.hostinger.in/vps-hosting)
   - OS: **Ubuntu 22.04**
   - Location: **India** (if users are in India)
2. Get your VPS IP and root password from the Hostinger panel
3. Point the client's **domain** (e.g., `app.clusterx.in`) to the VPS IP via an **A record** in DNS settings
4. SSH into the server:

```bash
ssh root@YOUR_VPS_IP
```

---

## Step 1 — Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Set timezone (India)
timedatectl set-timezone Asia/Kolkata

# Create a non-root user (recommended)
adduser deploy
usermod -aG sudo deploy

# Enable firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Switch to the deploy user
su - deploy
```

---

## Step 2 — Install Node.js 20

```bash
# Install Node.js 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # Should show v20.x
npm -v    # Should show 10.x
```

---

## Step 3 — Configure MongoDB Atlas (Cloud)

> [!NOTE]  
> Since you're using **MongoDB Atlas** (cloud-hosted), there's **no local MongoDB to install**. You just need to whitelist the VPS IP.

### 3a. Whitelist the VPS IP in Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Navigate to **Network Access** → **Add IP Address**
3. Add your VPS IP: `YOUR_VPS_IP`
4. Alternatively, add `0.0.0.0/0` to allow all IPs (less secure, but easier)

### 3b. Get the Connection String

Your Atlas URI should look like:
```
mongodb+srv://USERNAME:PASSWORD@cluster-name.xxxxx.mongodb.net/DATABASE_NAME?retryWrites=true&w=majority
```

This goes directly into the `.env` file as `MONGODB_URI`.

> [!TIP]
> Atlas M0 (free tier, 512MB) is fine for **up to ~20 users**. Upgrade to M10 ($30/mo) when you hit storage limits.

---

## Step 4 — Install PM2 & Nginx

```bash
# PM2 — Production process manager for Node.js
sudo npm install -g pm2

# Nginx — Reverse proxy
sudo apt install -y nginx
```

---

## Step 5 — Clone & Build Your Project

```bash
# Navigate to home folder
cd /home/deploy

# Clone your repo (use your actual repo URL)
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git bolna-dashboard
cd bolna-dashboard

# Install dependencies
npm install

# Build the frontend (React → dist/)
npm run build
```

> [!NOTE]
> After `npm run build`, the React app is compiled into the `dist/` folder. The Express server serves these static files in production mode via `server/static.ts`.

---

## Step 6 — Configure Environment Variables

```bash
# Create .env from the example
cp .env.example .env
nano .env
```

Fill in with the **client's actual values**:

```env
# ─── Server ──────────────────────────────────────────────────
PORT=5000
NODE_ENV=production

# ─── MongoDB Atlas ───────────────────────────────────────────
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.xxxxx.mongodb.net/callsDB?retryWrites=true&w=majority

# ─── Session Secret ─────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=PASTE_GENERATED_HEX_HERE

# ─── Google OAuth 2.0 ───────────────────────────────────────
# IMPORTANT: Update callback URL to the client's production domain!
GOOGLE_CLIENT_ID=client-google-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=client-google-secret
GOOGLE_CALLBACK_URL=https://CLIENT_DOMAIN/api/auth/google/callback

# ─── Encryption Key ─────────────────────────────────────────
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=PASTE_GENERATED_HEX_HERE

# ─── Bolna API ───────────────────────────────────────────────
# Per-user keys are stored encrypted in MongoDB
# This global key is optional (for background polling fallback)
# BOLNA_API_KEY=

# ─── LLM Keys ───────────────────────────────────────────────
GROK_API_KEY=gsk_xxxxx_client_groq_key

# ─── Razorpay ────────────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=client-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=client-webhook-secret

BASE_PLAN_PRICE=349900
```

> [!IMPORTANT]
> **3 things to update in external dashboards:**
> 1. **Google Cloud Console** → Add `https://CLIENT_DOMAIN/api/auth/google/callback` as an authorized redirect URI
> 2. **Razorpay Dashboard** → Add webhook URL: `https://CLIENT_DOMAIN/api/webhooks/razorpay`
> 3. **MongoDB Atlas** → Whitelist VPS IP in Network Access

---

## Step 7 — Start the App with PM2

```bash
cd /home/deploy/bolna-dashboard

# Start with PM2 using tsx (since server is TypeScript)
pm2 start npx --name "bolna" -- tsx server/index.ts

# Verify it's running
pm2 status
pm2 logs bolna --lines 30

# Save PM2 process list (survives reboot)
pm2 save

# Enable PM2 startup on boot
pm2 startup
# Copy and run the command it outputs (it will look like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

> [!TIP]
> Useful PM2 commands:
> - `pm2 logs bolna` — View live logs
> - `pm2 restart bolna` — Restart after code changes
> - `pm2 monit` — CPU/Memory dashboard

---

## Step 8 — Configure Nginx (Reverse Proxy + SSL)

### 8a. Create Nginx config

```bash
sudo nano /etc/nginx/sites-available/bolna
```

Paste this:

```nginx
server {
    listen 80;
    server_name CLIENT_DOMAIN;  # ← Replace with client's domain

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for long-running API calls
        proxy_read_timeout 120s;
        proxy_connect_timeout 120s;
    }

    # Increase upload size (for CSV imports, etc.)
    client_max_body_size 10M;
}
```

### 8b. Enable the site

```bash
sudo ln -s /etc/nginx/sites-available/bolna /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # Remove default page
sudo nginx -t                               # Test config
sudo systemctl reload nginx
```

### 8c. Install SSL (Free via Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d CLIENT_DOMAIN   # ← Replace with client's domain

# Auto-renewal is set up automatically. Test it:
sudo certbot renew --dry-run
```

---

## Step 9 — Deploy Updates (Future Workflow)

Whenever you push changes to the repo:

```bash
ssh deploy@YOUR_VPS_IP
cd /home/deploy/bolna-dashboard
git pull origin main
npm install
npm run build
pm2 restart bolna
pm2 logs bolna --lines 20
```

---

## ✅ Post-Deployment Checklist

| Task | How to verify |
|---|---|
| ✅ Site loads over HTTPS | Visit `https://CLIENT_DOMAIN` |
| ✅ Google OAuth works | Click "Sign in with Google" |
| ✅ Dashboard loads after login | Navigate to `/dashboard` |
| ✅ Razorpay payment works | Go to `/subscribe` and test |
| ✅ Scheduler is running | Check `pm2 logs bolna` for `[AutoPoll]` messages |
| ✅ Webhooks are reachable | Test from Razorpay Dashboard → Webhooks |
| ✅ Atlas connected | Check logs for `[MongoDB] Connected` |
| ✅ SSL auto-renews | `sudo certbot renew --dry-run` |
| ✅ PM2 survives reboot | `sudo reboot`, then check `pm2 status` |

---

## 🧯 Troubleshooting

| Problem | Solution |
|---|---|
| Site not loading | `pm2 status` → check if running. `pm2 logs bolna` for errors. |
| 502 Bad Gateway | Nginx can't reach Node.js. Check `pm2 status` and ensure PORT=5000. |
| Google OAuth redirect fails | `GOOGLE_CALLBACK_URL` in `.env` must match Google Cloud Console exactly. |
| Razorpay payments fail | Check `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `.env`. Look for `[Razorpay]` in logs. |
| MongoDB connection refused | Check Atlas Network Access → VPS IP must be whitelisted. Verify URI in `.env`. |
| SSL cert expired | Run `sudo certbot renew`. |
| Out of memory | `pm2 monit`. Consider KVM 2 if consistently >80% RAM. |
| Scheduler not polling | Search logs for `[AutoPoll]`. Users need `subscriptionStatus: "active"` or `"trial"`. |

---

## 💰 Hostinger VPS vs Render — Cost & Feature Comparison

### Infrastructure Cost Comparison

| | **Hostinger KVM 1** | **Render Starter** | **Render Standard** |
|---|---|---|---|
| **Monthly Cost** | ~₹600/mo ($7) | $7/mo (~₹590) | $25/mo (~₹2,100) |
| **Yearly Cost** | ~₹7,200/yr ($84) | $84/yr (~₹7,056) | $300/yr (~₹25,200) |
| **RAM** | 4 GB | 512 MB | 2 GB |
| **CPU** | 1 vCPU | Shared | 1 vCPU |
| **Storage** | 50 GB SSD | N/A (ephemeral) | N/A (ephemeral) |
| **Bandwidth** | 1 TB | 100 GB free | 100 GB free |
| **MongoDB** | Atlas (shared cost) | Atlas (shared cost) | Atlas (shared cost) |
| **SSL** | Free (Let's Encrypt) | Free (auto) | Free (auto) |

> [!NOTE]
> Since you're using MongoDB Atlas for both options, the DB cost is the same either way. The difference is purely **compute cost** (VPS vs Render web service).

### Total Cost by Scale (With Atlas)

| Scale | **Hostinger VPS** | **Render** |
|---|---|---|
| **Small** (1-5 users) | **₹600/mo** ($7) + Atlas M0 (free) | **₹590/mo** ($7) + Atlas M0 (free) |
| **Medium** (10-25 users) | **₹600/mo** ($7) + Atlas M0 (free) | **₹2,100/mo** ($25) + Atlas M0 (free) |
| **Large** (50+ users) | **₹1,200/mo** ($14) + Atlas M10 ($30) | **₹7,100/mo** ($85) + Atlas M10 ($30) |

### Feature Comparison

| Feature | **Hostinger VPS** | **Render** |
|---|---|---|
| **Setup difficulty** | ⚠️ Manual (SSH, Nginx, PM2) | ✅ Zero-config (Git push → deploy) |
| **Auto-deploy from Git** | ❌ Manual `git pull` + restart | ✅ Automatic on push |
| **Zero-downtime deploys** | ❌ Brief restart with PM2 | ✅ Built-in |
| **Server management** | ⚠️ You manage everything | ✅ Fully managed |
| **SSH access** | ✅ Full root access | ❌ No SSH |
| **India datacenter** | ✅ Available | ❌ US/EU only |

### 🏆 Which Should You Choose?

| If you... | Choose |
|---|---|
| Want the **cheapest option** at any scale | **Hostinger VPS** |
| Want **zero DevOps** and don't mind paying more | **Render** |
| Need **India datacenter** for low latency | **Hostinger VPS** |
| Want **auto-deploy on git push** | **Render** |
| Are scaling to **25+ users** | **Hostinger VPS** (₹600 vs ₹2,100/mo) |

---

## 💰 Hostinger Monthly Cost Summary

| Item | Cost |
|---|---|
| Hostinger KVM 1 | ~₹600/mo ($7) |
| MongoDB Atlas M0 | Free (512MB) |
| Domain (if buying new) | ~₹800/yr (~₹67/mo) |
| SSL (Let's Encrypt) | Free |
| Google OAuth | Free |
| **Total infrastructure** | **~₹600-670/mo** |
| + Bolna API usage | Variable (per call minute) |
| + LLM (Groq) | ~₹5/mo (negligible) |
| + Razorpay fees | 2% per transaction |