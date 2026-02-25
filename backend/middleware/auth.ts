import { Request, Response, NextFunction } from "express";
import { User } from "../models/User.js";

// Must be logged in via session
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ error: "Authentication required" });
}

// Must have active, non-expired subscription
// Automatically marks expired subscriptions
export async function isSubscribed(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const now = new Date();

    // Auto-expire active subscriptions past their expiry date
    if (
      user.subscriptionStatus === "active" &&
      user.subscriptionExpiresAt &&
      now > new Date(user.subscriptionExpiresAt)
    ) {
      await User.findByIdAndUpdate(user._id, { subscriptionStatus: "expired" });
      (req.user as any).subscriptionStatus = "expired";
    }

    // Auto-expire trials past their expiry date
    if (
      user.subscriptionStatus === "trial" &&
      user.trialExpiresAt &&
      now > new Date(user.trialExpiresAt)
    ) {
      await User.findByIdAndUpdate(user._id, { subscriptionStatus: "expired" });
      (req.user as any).subscriptionStatus = "expired";
      return res.status(403).json({
        message: "Trial expired.",
        action: "subscribe",
        redirectTo: "/billing",
      });
    }

    if (!(req.user as any).isSubscriptionActive) {
      return res.status(403).json({
        message: "Subscription required.",
        action: "subscribe",
        redirectTo: "/billing",
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Must have Bolna API key configured
export function hasBolnaKey(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user?.bolnaApiKey) {
    return res
      .status(400)
      .json({ error: "Bolna API key not configured. Go to /setup-api" });
  }
  next();
}
