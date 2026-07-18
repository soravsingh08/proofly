import mongoose from "mongoose";
import { SITE } from "../config/site.js";

const supportTicketSchema = new mongoose.Schema(
  {
    // null = guest ticket; set when the sender is logged in so their
    // tickets show up under "my tickets"
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, lowercase: true, trim: true },
    topic: { type: String, enum: SITE.supportTopics, default: "general" },
    message: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

export default mongoose.model("SupportTicket", supportTicketSchema);
