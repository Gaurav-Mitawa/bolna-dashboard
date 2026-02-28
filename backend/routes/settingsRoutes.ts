import { Router, Request, Response } from "express";
import { User } from "../models/User.js";
import { encrypt, decrypt } from "../utils/encrypt.js";
import { validateApiKey } from "../services/bolnaService.js";
import { isAuthenticated } from "../middleware/auth.js";
import { sensitiveLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// GET /api/settings — Return masked key + subscription info + days remaining
router.get("/", isAuthenticated, (req: Request, res: Response) => {
  const user = req.user as any;
  const maskedKey = user.bolnaApiKey
    ? "••••••••" + decrypt(user.bolnaApiKey).slice(-4)
    : null;

  // Calculate days remaining
  const now = Date.now();
  // Helper for calendar day calculation
  const getMidnight = (d: number | Date | string) => new Date(new Date(d).setHours(0, 0, 0, 0)).getTime();
  const todayMidnight = getMidnight(now);

  let daysRemaining = 0;
  let isTrial = false;

  if (user.trialExpiresAt && new Date(user.trialExpiresAt).getTime() > now) {
    daysRemaining = Math.round((getMidnight(user.trialExpiresAt) - todayMidnight) / (1000 * 60 * 60 * 24));
    isTrial = true;
  } else if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt).getTime() > now) {
    daysRemaining = Math.round((getMidnight(user.subscriptionExpiresAt) - todayMidnight) / (1000 * 60 * 60 * 24));
  }

  res.json({
    name: user.name,
    email: user.email,
    profileImage: user.profileImage,
    maskedKey,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
    trialExpiresAt: user.trialExpiresAt,
    trialStartedAt: user.trialStartedAt,
    isSubscriptionActive: user.isSubscriptionActive,
    daysRemaining,
    isTrial,
  });
});

// PUT /api/settings/bolna-api — Update + re-validate Bolna API key
router.put(
  "/bolna-api",
  isAuthenticated,
  sensitiveLimiter,
  async (req: Request, res: Response) => {
    try {
      const { bolnaApiKey } = req.body;
      if (!bolnaApiKey || bolnaApiKey.trim() === "") {
        return res.status(400).json({ error: "API key is required" });
      }

      const rawKey = bolnaApiKey.trim();

      // Validate new key before saving
      const isValid = await validateApiKey(rawKey);
      if (!isValid) {
        return res
          .status(400)
          .json({ error: "Invalid Bolna API key. Validation failed." });
      }

      const encryptedKey = encrypt(rawKey);
      const user = req.user as any;
      await User.findByIdAndUpdate(user._id, { bolnaApiKey: encryptedKey });

      res.json({ success: true, message: "Bolna API key updated successfully" });
    } catch (err: any) {
      console.error("Settings update error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
