import { Router, Request, Response } from "express";
import { User } from "../models/User.js";
import { encrypt } from "../utils/encrypt.js";
import { validateApiKey } from "../services/bolnaService.js";
import { isAuthenticated } from "../middleware/auth.js";
import { sensitiveLimiter } from "../middleware/rateLimiter.js";

import { PLANS } from "../config/plans.js";

const router = Router();

// GET /api/setup-api — Check if key is already set
router.get("/", isAuthenticated, (req: Request, res: Response) => {
  const user = req.user as any;
  if (user.bolnaApiKey) {
    return res.json({ configured: true });
  }
  res.json({ configured: false });
});

// POST /api/setup-api — Validate + save Bolna API key
router.post("/", isAuthenticated, sensitiveLimiter, async (req: Request, res: Response) => {
  try {
    const { bolnaApiKey } = req.body;
    if (!bolnaApiKey || bolnaApiKey.trim() === "") {
      return res.status(400).json({ error: "API key is required" });
    }

    const rawKey = bolnaApiKey.trim();
    const isBypass = rawKey === "bolna_dev_test";

    // Validate against Bolna before saving (skip for bypass)
    if (!isBypass) {
      const isValid = await validateApiKey(rawKey);
      if (!isValid) {
        return res
          .status(400)
          .json({ error: "Invalid Bolna API key. Check your key and try again." });
      }
    }

    const encryptedKey = encrypt(rawKey);
    const currentUser = req.user as any;

    const dbUser = await User.findById(currentUser._id);
    if (!dbUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const update: any = { bolnaApiKey: encryptedKey };

    // Start free trial if not already started (or 100-year trial if bypass)
    if (!dbUser.trialStartedAt || isBypass) {
      const now = new Date();
      update.trialStartedAt = now;
      const durationDays = isBypass ? 365 * 100 : PLANS.trial.durationDays;
      update.trialExpiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
      update.subscriptionStatus = isBypass ? "active" : "trial";
      console.log(`[SetupAPI] Starting ${isBypass ? "100-year" : `${PLANS.trial.durationDays}-day`} trial for user: ${dbUser._id}`);
    }

    await User.findByIdAndUpdate(dbUser._id, update);

    res.json({ success: true, redirect: "/dashboard" });
  } catch (err: any) {
    console.error("[SetupAPI] Unexpected Error:", err.stack || err);
    res.status(500).json({
      error: err.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  }
});

export default router;
