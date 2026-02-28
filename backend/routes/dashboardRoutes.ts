import { Router, Request, Response } from "express";
import { Customer } from "../models/Customer.js";
import { Campaign } from "../models/Campaign.js";
import { Payment } from "../models/Payment.js";
import { decrypt } from "../utils/encrypt.js";
import { isAuthenticated, isSubscribed } from "../middleware/auth.js";

const router = Router();

// GET /api/dashboard — Aggregated summary for the home screen
router.get("/", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = user._id;

    // CRM stats
    const crmStats = await Customer.aggregate([
      { $match: { userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const leads: Record<string, number> = {
      fresh: 0,
      interested: 0,
      not_interested: 0,
      booked: 0,
      NA: 0,
    };
    crmStats.forEach((s: any) => {
      leads[s._id] = s.count;
    });
    leads.total = Object.values(leads)
      .slice(0, 5)
      .reduce((a, b) => a + b, 0);

    // Campaign stats
    const [totalCampaigns, recentCampaigns] = await Promise.all([
      Campaign.countDocuments({ userId }),
      Campaign.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("name status leadCount scheduledAt createdAt"),
    ]);

    // Subscription & Trial info
    const expiresAt = user.subscriptionExpiresAt;
    const trialExpiresAt = user.trialExpiresAt;
    const now = Date.now();

    // Helper for calendar day calculation
    const getMidnight = (d: number | Date | string) => new Date(new Date(d).setHours(0, 0, 0, 0)).getTime();
    const todayMidnight = getMidnight(now);

    let daysLeft = 0;
    let isTrial = false;

    if (trialExpiresAt && new Date(trialExpiresAt).getTime() > now) {
      daysLeft = Math.round((getMidnight(trialExpiresAt) - todayMidnight) / (1000 * 60 * 60 * 24));
      isTrial = true;
    } else if (expiresAt && new Date(expiresAt).getTime() > now) {
      daysLeft = Math.round((getMidnight(expiresAt) - todayMidnight) / (1000 * 60 * 60 * 24));
    }

    // Bolna key info — masked, never expose decrypted key
    const bolnaKeyStatus = user.bolnaApiKey
      ? {
        configured: true,
        masked: "••••••••" + decrypt(user.bolnaApiKey).slice(-4),
      }
      : { configured: false, masked: null };

    // Last successful payment
    const lastPayment = await Payment.findOne({ userId, status: "success" })
      .sort({ createdAt: -1 })
      .select("amountPaid periodStart periodEnd createdAt")
      .lean();

    res.json({
      user: {
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
      },
      leads,
      campaigns: { total: totalCampaigns, recent: recentCampaigns },
      subscription: {
        status: user.subscriptionStatus,
        expiresAt: user.subscriptionExpiresAt,
        trialExpiresAt: user.trialExpiresAt,
        daysLeft,
        isTrial,
      },
      lastPayment: lastPayment ? {
        amountPaid: lastPayment.amountPaid / 100, // paise → rupees
        periodStart: lastPayment.periodStart,
        periodEnd: lastPayment.periodEnd,
        paidAt: lastPayment.createdAt,
      } : null,
      bolnaKey: bolnaKeyStatus,
    });
  } catch (err: any) {
    console.error("Dashboard error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
