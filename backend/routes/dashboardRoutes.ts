import { Router, Request, Response } from "express";
import axios from "axios";
import { Customer } from "../models/Customer.js";
import { Campaign } from "../models/Campaign.js";
import { Payment } from "../models/Payment.js";
import { decrypt } from "../utils/encrypt.js";
import { getApiKey } from "../services/bolnaService.js";
import { isAuthenticated, isSubscribed } from "../middleware/auth.js";

const BOLNA_HOST = "https://api.bolna.ai";

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
 * Fetches call executions directly from the Bolna API for dashboard charts.
 * Uses GET /v2/agent/{agent_id}/executions with date range + full pagination.
 * Aggregates across all agents owned by this user.
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
      const user = req.user as any;

      // ── 1. Decrypt Bolna API key ─────────────────────────────────────────
      if (!user.bolnaApiKey) {
        return res.status(400).json({
          error: "Bolna API key not configured. Please go to Settings to add your key.",
        });
      }

      let apiKey: string;
      try {
        apiKey = getApiKey(user.bolnaApiKey);
      } catch {
        return res.status(400).json({
          error: "Failed to decrypt your Bolna API key. Please re-save it in Settings.",
        });
      }

      const authHeaders = { Authorization: `Bearer ${apiKey}` };
      const { from, to } = req.query as { from?: string; to?: string };

      // ── 2. Fetch all agents for this user ────────────────────────────────
      let agents: any[] = [];
      try {
        const agentsResp = await axios.get(`${BOLNA_HOST}/v2/agent/all`, {
          headers: authHeaders,
          timeout: 15000,
        });
        agents = Array.isArray(agentsResp.data) ? agentsResp.data : [];
      } catch (agentErr: any) {
        console.error("[Dashboard/executions] Failed to fetch agents:", agentErr.message);
        return res.status(502).json({
          error: "Could not reach Bolna API to fetch agents. Please try again.",
        });
      }

      if (!agents.length) {
        return res.json({ data: [], total: 0 });
      }

      // ── 3. Paginate executions for each agent with date filter ───────────
      // Bolna max page_size = 50. We cap at 10 pages (500 execs) per agent for dashboard use.
      const MAX_PAGES_PER_AGENT = 10;
      const PAGE_SIZE = 50;

      const allExecutions: any[] = [];

      await Promise.all(
        agents.map(async (agent: any) => {
          const agentId = agent.id || agent.agent_id;
          if (!agentId) return;

          let page = 1;
          let hasMore = true;

          while (hasMore && page <= MAX_PAGES_PER_AGENT) {
            try {
              const params = new URLSearchParams({
                page_size: String(PAGE_SIZE),
                page_number: String(page),
              });
              if (from) params.set("from", from);
              if (to)   params.set("to",   to);

              const execResp = await axios.get(
                `${BOLNA_HOST}/v2/agent/${agentId}/executions?${params}`,
                { headers: authHeaders, timeout: 15000 }
              );

              const pageData: any[] = execResp.data?.data ?? [];
              allExecutions.push(...pageData);

              hasMore = execResp.data?.has_more === true && pageData.length > 0;
              page++;
            } catch (execErr: any) {
              // Log but don't fail the whole request — skip this agent's page
              console.error(
                `[Dashboard/executions] Error fetching agent ${agentId} page ${page}:`,
                execErr.message
              );
              hasMore = false;
            }
          }
        })
      );

      res.json({
        data: allExecutions,
        total: allExecutions.length,
      });
    } catch (err: any) {
      console.error("[Dashboard/executions] Unexpected error:", err.message);
      res.status(500).json({ error: "Failed to fetch executions. Please try again." });
    }
  }
);

export default router;
