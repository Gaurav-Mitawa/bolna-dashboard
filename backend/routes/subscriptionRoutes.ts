import { Router, Request, Response } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { User } from "../models/User.js";
import { Payment } from "../models/Payment.js";
import { Coupon } from "../models/Coupon.js";

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
        userId: req.tenantId,
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

// POST /api/subscribe/start-trial — Free trial start (7 days) or extend with coupon (30 days)
router.post("/start-trial", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)._id;
    const { couponCode } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Must have API key configured first
    if (!user.bolnaApiKey) {
      return res.status(400).json({ message: "Please set up your API key first." });
    }

    // Reject if coupon already applied — one coupon per account
    if (user.couponApplied) {
      return res.status(400).json({ message: "A coupon has already been applied to your account." });
    }

    // If trial already started and no coupon provided, block (trial already running)
    if (user.trialStartedAt && (!couponCode || !couponCode.trim())) {
      return res.status(400).json({ message: "Your trial is already active. Enter a coupon code to extend it." });
    }

    // Determine trial duration
    let trialDays = PLANS.trial.durationDays; // Default: 7 days
    let appliedCoupon: string | null = null;

    // Validate and apply coupon if provided
    if (couponCode && couponCode.trim()) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase().trim(),
        isActive: true,
      });

      if (!coupon) {
        return res.status(400).json({
          message: "Invalid or expired coupon code",
          field: "couponCode",
        });
      }

      trialDays = coupon.trialDays;
      appliedCoupon = coupon.code;
    }

    // Case A: Trial already started → extend from original trialStartedAt (keep start date)
    if (user.trialStartedAt && appliedCoupon) {
      const extendedEnd = new Date(user.trialStartedAt);
      extendedEnd.setDate(extendedEnd.getDate() + trialDays);

      user.trialExpiresAt = extendedEnd;
      user.trialEndDate = extendedEnd;
      user.couponApplied = appliedCoupon;
      // trialStartedAt is intentionally NOT reset — keep the original start date

      await user.save();

      console.log(
        `[Subscription] Trial extended to ${trialDays} days for user: ${userId} with coupon: ${appliedCoupon}. New expiry: ${extendedEnd}`
      );

      return res.json({
        message: `Trial extended to ${trialDays} days`,
        trialExpiresAt: extendedEnd,
        couponApplied: true,
      });
    }

    // Case B: No trial yet → start fresh trial
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + trialDays);

    user.subscriptionStatus = "trial";
    user.trialStartedAt = now;
    user.trialExpiresAt = trialEnd;
    user.trialEndDate = trialEnd;
    user.couponApplied = appliedCoupon;

    await user.save();

    console.log(
      `[Subscription] ${trialDays}-day trial started for user: ${userId}${
        appliedCoupon ? ` with coupon: ${appliedCoupon}` : ""
      }. Expires: ${trialEnd}`
    );

    res.json({
      message: `Trial started successfully (${trialDays} days)`,
      trialExpiresAt: trialEnd,
      couponApplied: appliedCoupon !== null,
    });
  } catch (err: any) {
    console.error("[Subscription] Start-trial error:", err.stack || err.message || err);
    res.status(500).json({ message: "Failed to start trial" });
  }
});

export default router;

// ─── Shared activation logic (used by both route and webhook) ─────────────────
export async function activateSubscription(
  userId: string,
  orderId: string,
  paymentId: string
): Promise<void> {
  // Include userId in Payment queries for tenant isolation
  const payment = await Payment.findOne({ razorpayOrderId: orderId, userId });
  if (!payment || payment.status === "success") return; // already processed

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found for subscription activation");

  const { periodStart, periodEnd } = calculateNewExpiry(user.subscriptionExpiresAt);

  await Payment.findOneAndUpdate(
    { razorpayOrderId: orderId, userId },
    {
      razorpayPaymentId: paymentId,
      status: "success",
      periodStart,
      periodEnd,
    }
  );

  await User.findByIdAndUpdate(userId, {
    $set: {
      subscriptionStatus: "active",
      subscriptionExpiresAt: periodEnd,
      currentPeriodStart: periodStart,
    },
    $unset: {
      trialExpiresAt: 1,
      trialStartedAt: 1,
    }
  });

  console.log(`[Subscription] Activated for user ${userId}, expires ${periodEnd}`);
}
