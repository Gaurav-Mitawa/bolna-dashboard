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

  let maskedKey: string | null = null;
  if (user.bolnaApiKey) {
    try {
      maskedKey = "••••••••" + decrypt(user.bolnaApiKey).slice(-4);
    } catch {
      // ENCRYPTION_KEY may differ between deploys — return null instead of crashing
      maskedKey = "••••••••????";
    }
  }

  // Calculate days remaining
  const now = Date.now();
  const getMidnight = (d: number | Date | string) =>
    new Date(new Date(d).setHours(0, 0, 0, 0)).getTime();
  const todayMidnight = getMidnight(now);

  let daysRemaining = 0;
  let isTrial = false;

  if (user.trialExpiresAt && new Date(user.trialExpiresAt).getTime() > now) {
    daysRemaining = Math.round(
      (getMidnight(user.trialExpiresAt) - todayMidnight) / (1000 * 60 * 60 * 24)
    );
    isTrial = true;
  } else if (
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt).getTime() > now
  ) {
    daysRemaining = Math.round(
      (getMidnight(user.subscriptionExpiresAt) - todayMidnight) / (1000 * 60 * 60 * 24)
    );
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

      // ── Step 1: Validate key with Bolna API ──────────────────────────────
      let isValid = false;
      let validationSkipped = false;
      try {
        isValid = await validateApiKey(rawKey);
      } catch (validationErr: any) {
        // Bolna API unreachable (network error, timeout, 5xx).
        // Save key optimistically so users can set up even during Bolna outages.
        console.warn("[Settings] Bolna validation unreachable:", validationErr.message);
        validationSkipped = true;
        isValid = true; // proceed to save
      }

      if (!isValid) {
        return res.status(400).json({
          error: "Invalid Bolna API key — the key was rejected by Bolna. Please check your key and try again.",
        });
      }

      // ── Step 2: Encrypt & persist ─────────────────────────────────────────
      let encryptedKey: string;
      try {
        encryptedKey = encrypt(rawKey);
      } catch (encErr: any) {
        console.error("[Settings] Encryption failed:", encErr.message);
        return res.status(500).json({
          error: "Server configuration error: encryption key is not set. Contact support.",
        });
      }

      const user = req.user as any;
      await User.findByIdAndUpdate(user._id, { bolnaApiKey: encryptedKey });

      res.json({
        success: true,
        message: validationSkipped
          ? "API key saved. Live validation was skipped (Bolna API unreachable) — key will be verified on first use."
          : "Bolna API key updated successfully",
      });
    } catch (err: any) {
      console.error("[Settings] PUT /bolna-api unexpected error:", err.message);
      res.status(500).json({ error: "Failed to update API key. Please try again." });
    }
  }
);

export default router;
