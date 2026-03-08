import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        console.log(`[Auth] Attempting login for Google ID: ${profile.id}, Email: ${profile.emails?.[0]?.value}`);
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          console.log("[Auth] User not found by Google ID, creating new user...");
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value ?? "",
            profileImage: profile.photos?.[0]?.value ?? "",
          });
          console.log("[Auth] New user created successfully:", user._id);
        } else {
          console.log("[Auth] Found existing user by Google ID:", user._id);
        }
        return done(null, user);
      } catch (err: any) {
        console.error("[Auth] Error in Google Strategy callback:", err.message || err);
        return done(err, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
