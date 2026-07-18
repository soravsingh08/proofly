import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import contributionRoutes from "./routes/contributions.js";
import statsRoutes from "./routes/stats.js";
import publicRoutes from "./routes/public.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import importRoutes from "./routes/importMetaAds.js";
import { ROLES } from "./config/roles.js";

// fail loud at boot, not silently at 2am (A7)
for (const key of ["MONGO_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} is not set (check server/.env)`);
    process.exit(1);
  }
}

const app = express();

const origins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:5174",
].filter(Boolean);
app.use(cors({ origin: origins })); // H2
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true })); // H1 pre-warm ping
app.get("/api/roles", (req, res) => res.json({ roles: ROLES }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/import/meta-ads", importRoutes);

// last-resort error handler — never leak stack traces
app.use((err, req, res, next) => {
  console.error("unhandled:", err);
  res.status(500).json({ error: "Something went wrong" });
});

const PORT = process.env.PORT || 5001;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Proofly API on :${PORT}`));
  })
  .catch((err) => {
    console.error("FATAL: MongoDB connection failed:", err.message);
    process.exit(1);
  });
