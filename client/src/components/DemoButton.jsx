// One-click demo login, shared by the landing hero and both auth
// pages. Signs into the showcase account and lands on the dashboard;
// if the demo account is missing, falls back to the public profile.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Icon } from "./icons";

export default function DemoButton({ label = "Explore with the demo account", className = "" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function tryDemo() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.post("/auth/demo");
      login(r.data);
      navigate("/dashboard");
    } catch {
      navigate("/u/arjun");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={tryDemo}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-60 ${className}`}
    >
      <Icon name="sparkles" size={14} className="text-brand" />
      {busy ? "Opening demo…" : label}
    </button>
  );
}

// "or" divider used between the form and the demo button
export function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] text-mute my-4">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
