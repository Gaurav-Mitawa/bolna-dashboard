import { Router, Request, Response } from "express";
import { Customer } from "../models/Customer.js";
import { Campaign } from "../models/Campaign.js";
import { Payment } from "../models/Payment.js";
import { Call } from "../models/Call.js";
import { decrypt } from "../utils/encrypt.js";
import { isAuthenticated, isSubscribed } from "../middleware/auth.js";

const router = Router();

// GET /api/dashboard — Aggregated summary for the home screen
router.get("/", isAuthenticated, isSubscribed, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const userId = req.tenantId;

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

/**
 * GET /api/dashboard/executions
 *
 * Reads call records from MongoDB (Call collection) for dashboard donut charts.
 * Uses call_direction from MongoDB (always "inbound" or "outbound") so the
 * inbound/outbound filter works correctly.
 *
 * Query params:
 *   from  — ISO 8601 datetime, e.g. 2025-03-01T00:00:00.000Z
 *   to    — ISO 8601 datetime, e.g. 2025-03-08T23:59:59.999Z
 */
router.get(
  "/executions",
  isAuthenticated,
  isSubscribed,
  async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)._id;
      const { from, to } = req.query as { from?: string; to?: string };

      // Build date filter
      const dateFilter: any = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to)   dateFilter.$lte = new Date(to);

      const callFilter: any = { userId };
      if (Object.keys(dateFilter).length) {
        callFilter.call_timestamp = dateFilter;
      }

      // Read from MongoDB — call_direction is always set by the sync poller
      const calls = await Call.find(callFilter)
        .sort({ call_timestamp: -1 })
        .limit(500)
        .lean();

      const data = calls.map((c: any) => ({
        id: c.call_id || c._id.toString(),
        agent_id: c.agentId,
        status: c.status || "completed",
        created_at: c.created_at || c.call_timestamp,
        transcript: c.transcript || null,
        extracted_data: c.extracted_data || null,
        llm_analysis: c.llm_analysis || null,
        telephony_data: {
          call_type: c.call_direction,  // "inbound" or "outbound" — always set from poller
        },
      }));

      res.json({ data, total: data.length });
    } catch (err: any) {
      console.error("[Dashboard/executions] Unexpected error:", err.message);
      res.status(500).json({ error: "Failed to fetch executions. Please try again." });
    }
  }
);

export default router;
