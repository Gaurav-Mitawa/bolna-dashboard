import { Router, Request, Response } from "express";
import passport from "passport";
import mongoose from "mongoose";

const router = Router();

// GET /api/auth/google — Initiate Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// GET /api/auth/google/callback — OAuth callback
router.get(
  "/google/callback",
  (req: Request, res: Response, next: any) => {
    passport.authenticate("google", (err: any, user: any, _info: any) => {
      if (err) {
        // Log the real error so it's visible in server terminal
        console.error("[Auth] Google OAuth callback error:", err.message || err);
        // Redirect with a meaningful error instead of a 500 crash
        const msg = err.message?.includes("ECONNREFUSED") || err.message?.includes("connect")
          ? "db_unavailable"
          : "auth_error";
        return res.redirect(`/login?error=${msg}`);
      }
      if (!user) return res.redirect("/login?error=auth_failed");

      // Manually log the user in (creates the session)
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("[Auth] Session save error:", loginErr.message || loginErr);
          return res.redirect("/login?error=session_error");
        }
        // Redirect based on account state
        if (!user.bolnaApiKey) return res.redirect("/setup-api");
        if (!user.isSubscriptionActive) return res.redirect("/subscribe");
        res.redirect("/dashboard");
      });
    })(req, res, next);
  }
);

// GET /api/health — Check server + MongoDB status
router.get("/health", (_req: Request, res: Response) => {
  const states: Record<number, string> = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    status: "ok",
    db: states[mongoose.connection.readyState] ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/auth/me — Return current session user
router.get("/me", (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as any;
    if (!user) {
      return res.status(401).json({ error: "No user in session" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      bolnaKeySet: !!user.bolnaApiKey,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiresAt: user.subscriptionExpiresAt,
      trialExpiresAt: user.trialExpiresAt,
      trialStartedAt: user.trialStartedAt,
      isSubscriptionActive: user.isSubscriptionActive,
    });
  } catch (err: any) {
    console.error("[Auth] Error in /me route:", err.message || err);
    res.status(500).json({ error: "Internal server error during session retrieval" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.json({ success: true });
    });
  });
});

// GET /api/auth/logout (for convenience links)
router.get("/logout", (req: Request, res: Response) => {
  req.logout(() => {
    req.session?.destroy(() => {
      res.redirect("/login");
    });
  });
});

export default router;
