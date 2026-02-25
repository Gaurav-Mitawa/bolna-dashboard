import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  googleId: string;
  name: string;
  email: string;
  profileImage: string;
  bolnaApiKey: string | null;           // AES-256 encrypted, never plaintext
  subscriptionStatus: "inactive" | "trial" | "active" | "expired";
  subscriptionExpiresAt: Date | null;   // set on each payment
  currentPeriodStart: Date | null;      // start of paid month
  trialStartedAt: Date | null;          // start of 7-day trial
  trialExpiresAt: Date | null;          // end of 7-day trial
  createdAt: Date;
  isSubscriptionActive: boolean;        // virtual
}

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    profileImage: { type: String, default: "" },
    bolnaApiKey: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: ["inactive", "trial", "active", "expired"],
      default: "inactive",
    },
    subscriptionExpiresAt: { type: Date, default: null },
    currentPeriodStart: { type: Date, default: null },
    trialStartedAt: { type: Date, default: null },
    trialExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Virtual — check if subscription or trial is currently valid
userSchema.virtual("isSubscriptionActive").get(function (this: IUser) {
  const now = new Date();

  // 1. Check for active trial
  if (this.trialExpiresAt && now < new Date(this.trialExpiresAt)) {
    return true;
  }

  // 2. Check for active paid subscription
  if (this.subscriptionStatus !== "active") return false;
  if (!this.subscriptionExpiresAt) return false;
  return now < new Date(this.subscriptionExpiresAt);
});

export const User = mongoose.model<IUser>("User", userSchema);
