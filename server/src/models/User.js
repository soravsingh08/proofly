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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
