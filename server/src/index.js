// Long-running server entry — local dev and Render/Railway.
// The Express app itself lives in src/app.js so Vercel's
// serverless entry (api/index.js) can reuse it; cron jobs only
// run here, since serverless has no always-on process.
import mongoose from "mongoose";
import app from "./app.js";
import { startJobs } from "./jobs/scheduler.js";

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
