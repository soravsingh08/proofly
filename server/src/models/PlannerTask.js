import mongoose from "mongoose";
import { DATE_RE } from "../services/dates.js";

// tiny week-planner items — plan the work, then log it when done
const plannerTaskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: String, required: true, match: DATE_RE },
    text: { type: String, required: true, trim: true, maxlength: 140 },
    done: { type: Boolean, default: false },
  },
  { timestamps: true }
);

plannerTaskSchema.index({ userId: 1, date: 1 });

export default mongoose.model("PlannerTask", plannerTaskSchema);
