import mongoose from "mongoose";
import { ROLE_KEYS } from "../config/roles.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[a-z0-9_-]{3,20}$/, // edge case A2
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: [...ROLE_KEYS, null], default: null }, // A5
    headline: { type: String, default: "", maxlength: 120 },
    githubUsername: { type: String, default: "", trim: true },
    // yyyy-mm-dd days covered by a streak freeze — bridge gaps, add no activity
    streakFreezes: { type: [String], default: [] },
    emailReminders: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false }, // set via npm run make-admin, never via API
    // Meta (Facebook) Ads connection — dev-mode OAuth, own ad account
    metaConnection: {
      adAccountId: { type: String, default: "" },
      adAccountName: { type: String, default: "" },
      accessToken: { type: String, default: "" }, // long-lived user token
      connectedAt: { type: Date, default: null },
      lastSyncAt: { type: Date, default: null },
    },
    // cached AI-generated recruiter summary (regenerated on demand)
    aiSummary: {
      text: { type: String, default: "" },
      highlights: { type: [String], default: [] },
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
