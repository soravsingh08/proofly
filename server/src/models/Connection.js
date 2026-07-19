import mongoose from "mongoose";

// A connected data source we sync daily: a GitHub repo, a shared
// Google Sheet, or a YouTube channel. Contributions it produces
// carry its _id so a re-sync (or disconnect) replaces cleanly.
const connectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["github_repo", "sheet", "youtube"],
      required: true,
    },
    label: { type: String, required: true, maxlength: 120 },
    config: {
      repo: { type: String, default: "" }, // "owner/name"
      url: { type: String, default: "" }, // sheet link
      channelId: { type: String, default: "" }, // UC…
    },
    lastSyncAt: { type: Date, default: null },
    lastSynced: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("Connection", connectionSchema);
