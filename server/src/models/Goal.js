import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    metricKey: { type: String, required: true },
    weeklyTarget: { type: Number, required: true, min: 1, max: 1_000_000 },
  },
  { timestamps: true }
);

// one goal per metric per user
goalSchema.index({ userId: 1, metricKey: 1 }, { unique: true });

export default mongoose.model("Goal", goalSchema);
