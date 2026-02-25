import { Router, Request, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";

import { calculateNewExpiry } from "../utils/subscriptionHelper.js";
import { isAuthenticated } from "../middleware/auth.js";
import { sensitiveLimiter } from "../middleware/rateLimiter.js";
import { PLANS } from "../config/plans.js";

const router = Router();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeyId || !razorpayKeySecret || razorpayKeyId.includes("xxxx")) {
  console.warn("[Razorpay] Warning: Razorpay keys are not configured or are placeholders. Payments will fail.");
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId || "placeholder",
  key_secret: razorpayKeySecret || "placeholder",
});

const BASE_PRICE = PLANS.growth.priceInPaise;

// GET /api/subscribe/config — Return Razorpay key + subscription status
router.get("/config", isAuthenticated, (req: Request, res: Response) => {
  const user = req.user as any;
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    basePriceDisplay: BASE_PRICE / 100,
    subscriptionStatus: user.subscriptionStatus,
    expiresAt: user.subscriptionExpiresAt,
    isActive: user.isSubscriptionActive,
  });
});



// POST /api/subscribe/create-order
router.post(
  "/create-order",
  isAuthenticated,
  sensitiveLimiter,
  async (req: Request, res: Response) => {
    try {
      const amount = BASE_PRICE;

      const user = req.user as any;
      const order = await razorpay.orders.create({
        amount,
        currency: "INR",
        receipt: `rcpt_${String(user._id).slice(-8)}_${Date.now()}`.slice(0, 40),
      });

      await Payment.create({
        userId: user._id,
        razorpayOrderId: order.id,
        amountPaid: amount,
        status: "pending",
      });

      res.json({
        orderId: order.id,
        amount,
        currency: "INR",
        userName: user.name,
        userEmail: user.email,
      });
    } catch (err: any) {
      console.error("[Razorpay] Create order error:", err.stack || err.message || err);
      res.status(500).json({
        error: "Failed to create payment order",
        details: process.env.NODE_ENV === "development" ? err.message : undefined
      });
    }
  }
);

// POST /api/subscribe/verify-payment — Client-side callback after Razorpay success
router.post("/verify-payment", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res
        .status(400)
        .json({ error: "Payment verification failed — invalid signature" });
    }

    const user = req.user as any;
    await activateSubscription(user._id, razorpay_order_id, razorpay_payment_id);

    res.json({ success: true, redirect: "/dashboard" });
  } catch (err: any) {
    console.error("Verify payment error:", err.message);
    res.status(500).json({ error: "Payment verification error" });
  }
});

// POST /api/subscribe/dev-bypass
router.post("/dev-bypass", isAuthenticated, async (req: Request, res: Response) => {
  console.log(`[Subscription] Dev-bypass request from user: ${req.user ? (req.user as any)._id : 'unknown'}`);
  try {
    const user = req.user as any;
    if (!user) {
      console.error("[Subscription] Dev-bypass failed: req.user is missing despite isAuthenticated");
      return res.status(401).json({ error: "No user session found" });
    }

    // Grant 100-year trial
    const trialStartedAt = new Date();
    const trialExpiresAt = new Date();
    trialExpiresAt.setFullYear(trialExpiresAt.getFullYear() + 100);

    const updatedUser = await User.findByIdAndUpdate(user._id, {
      trialStartedAt,
      trialExpiresAt,
      subscriptionStatus: 'active'
    }, { returnDocument: 'after' });

    if (!updatedUser) {
      console.error(`[Subscription] Dev-bypass failed: User ${user._id} not found in DB`);
      return res.status(404).json({ error: "User not found in database" });
    }

    console.log(`[Subscription] Dev-bypass SUCCESS for user: ${user._id}. Trial expires: ${trialExpiresAt}`);
    res.json({ success: true, redirect: "/dashboard" });
  } catch (err: any) {
    console.error("[Subscription] Dev-bypass error:", err.stack || err.message || err);
    res.status(500).json({ error: "Bypass failed", details: err.message });
  }
});

// POST /api/subscribe/start-trial — 7-day free trial for new users
router.post("/start-trial", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    // Must have API key configured first
    if (!user.bolnaApiKey) {
      return res.status(400).json({ error: "Please set up your API key first." });
    }

    // Must not have already started a trial
    if (user.trialStartedAt) {
      return res.status(400).json({ error: "You have already used your free trial." });
    }

    const now = new Date();
    const trialExpiresAt = new Date(now.getTime() + PLANS.trial.durationDays * 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      trialStartedAt: now,
      trialExpiresAt,
      subscriptionStatus: "trial",
    });

    console.log(`[Subscription] 7-day trial started for user: ${user._id}. Expires: ${trialExpiresAt}`);
    res.json({ success: true, redirect: "/dashboard" });
  } catch (err: any) {
    console.error("[Subscription] Start-trial error:", err.stack || err.message || err);
    res.status(500).json({ error: "Failed to start trial" });
  }
});

export default router;

// ─── Shared activation logic (used by both route and webhook) ─────────────────
export async function activateSubscription(
  userId: string,
  orderId: string,
  paymentId: string
): Promise<void> {
  const payment = await Payment.findOne({ razorpayOrderId: orderId });
  if (!payment || payment.status === "success") return; // already processed

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found for subscription activation");

  const { periodStart, periodEnd } = calculateNewExpiry(user.subscriptionExpiresAt);

  await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId },
    {
      razorpayPaymentId: paymentId,
      status: "success",
      periodStart,
      periodEnd,
    }
  );

  await User.findByIdAndUpdate(userId, {
    subscriptionStatus: "active",
    subscriptionExpiresAt: periodEnd,
    currentPeriodStart: periodStart,
  });

  console.log(`[Subscription] Activated for user ${userId}, expires ${periodEnd}`);
}
