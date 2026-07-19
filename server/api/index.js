// Vercel serverless entry. The mongoose connection is cached on
// the module scope so warm invocations reuse it instead of
// reconnecting on every request.
import mongoose from "mongoose";
import app from "../src/app.js";

let connecting = null;

export default async function handler(req, res) {
  if (mongoose.connection.readyState !== 1) {
    connecting ||= mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 5, // serverless: many small instances, keep pools tiny
    });
    try {
      await connecting;
    } catch (err) {
      connecting = null; // allow retry on next invocation
      console.error("Mongo connect failed:", err.message);
      return res.status(503).json({ error: "Database unavailable" });
    }
  }
  return app(req, res);
}
