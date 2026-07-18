import mongoose from "mongoose";
import { DATE_RE } from "../services/dates.js";

const contributionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: { type: String, required: true, index: true },
    // yyyy-mm-dd STRING by design — see services/dates.js (B7)
    date: { type: String, required: true, match: DATE_RE },
    metrics: { type: Map, of: Number, required: true },
    weightedTotal: { type: Number, required: true, min: 0 },
    note: { type: String, default: "", maxlength: 280 }, // B9
    // proof link (PR, live campaign, Behance shot...) — rung 2 of the ladder
    evidenceUrl: { type: String, default: "", maxlength: 300 },
    verification: {
      type: String,
      enum: ["self_reported", "evidence", "imported", "synced"],
      default: "self_reported",
    },
    source: {
      type: String,
      enum: ["manual", "excel_import", "github_sync", "seed", "meta_api"],
      default: "manual",
    },
  },
  { timestamps: true }
);

contributionSchema.index({ userId: 1, date: 1 });

export default mongoose.model("Contribution", contributionSchema);
