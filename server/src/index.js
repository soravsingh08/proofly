import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import passport from "./config/passport.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import contributionRoutes from "./routes/contributions.js";
import statsRoutes from "./routes/stats.js";
import publicRoutes from "./routes/public.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import importRoutes from "./routes/importMetaAds.js";
import supportRoutes from "./routes/support.js";
import goalRoutes from "./routes/goals.js";
import integrationRoutes from "./routes/integrations.js";
import adminRoutes from "./routes/admin.js";
import exportRoutes from "./routes/export.js";
import aiRoutes from "./routes/ai.js";
import metaRoutes from "./routes/meta.js";
import { ROLES } from "./config/roles.js";
import { SITE } from "./config/site.js";
import { startJobs } from "./jobs/scheduler.js";

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
app.use(passport.initialize()); // stateless — no passport.session()

app.get("/api/health", (req, res) => res.json({ ok: true })); // H1 pre-warm ping
app.get("/api/roles", (req, res) => res.json({ roles: ROLES }));
app.get("/api/site", (req, res) => res.json(SITE)); // about + team pages

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contributions", contributionRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/import/meta-ads", importRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/meta", metaRoutes);

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
    startJobs();
    app.listen(PORT, () => console.log(`Proofly API on :${PORT}`));
  })
  .catch((err) => {
    console.error("FATAL: MongoDB connection failed:", err.message);
    process.exit(1);
  });
