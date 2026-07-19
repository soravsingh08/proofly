// Demo login with a role picker — judges can explore Proofly as any
// profession. Picking a role signs into that field's showcase account.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Icon } from "./icons";

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

export default function DemoButton({ label = "Explore with the demo account", className = "" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function demo(role) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.post("/auth/demo", { role });
      login(r.data);
      navigate("/dashboard");
    } catch {
      navigate("/u/arjun"); // demo account missing: show the public profile
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div
      ref={boxRef}
      className={`relative ${className.includes("w-full") ? "block w-full" : "inline-block"}`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-2 disabled:opacity-60 ${className}`}
      >
        <Icon name="sparkles" size={14} className="text-brand" />
        {busy ? "Opening demo…" : label}
      </button>

      {open && (
        <div className="pop-in absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-64 bg-card border border-line rounded-xl shadow-2xl shadow-black/40 p-1.5 text-left">
          <p className="text-[10px] uppercase tracking-[0.15em] text-mute px-2.5 pt-1.5 pb-1">
            Try Proofly as a…
          </p>
          {ROLE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => demo(k)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink hover:bg-card2 transition"
            >
              <span style={{ color: ROLES[k].color }}>
                <Icon name={ROLES[k].icon} size={14} />
              </span>
              {ROLES[k].label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
