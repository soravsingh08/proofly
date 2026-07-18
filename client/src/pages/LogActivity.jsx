import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Button, Card, Input } from "../components/ui";
import { addDays, localToday } from "../utils/dates";

// The daily logging form — fields GENERATED from role config.
export default function LogActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = ROLES[user.role];
  const today = localToday();

  const [date, setDate] = useState(today);
  const [values, setValues] = useState({});
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return; // double-click guard (B8)
    const metrics = {};
    for (const [k, v] of Object.entries(values)) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) metrics[k] = n;
    }
    if (Object.keys(metrics).length === 0) {
      setError("Log at least one metric — zeros don't count.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/contributions", { date, metrics, note });
      // pass logged date so the dashboard pops that square
      navigate("/dashboard", { state: { popDate: date } });
    } catch (err) {
      setError(errMsg(err, "Could not save"));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">
        {role.icon} Log your work
      </h1>
      <p className="text-sm text-mute mb-6">
        {role.label} · every day you log builds your public proof.
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Date (backfill up to 30 days)"
            type="date"
            value={date}
            min={addDays(today, -30)}
            max={today}
            required
            onChange={(e) => setDate(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            {role.metrics.map((m) => (
              <Input
                key={m.key}
                label={m.label + (m.type === "currency" ? " (₹)" : m.type === "percent" ? " (%)" : m.type === "ratio" ? " (x)" : "")}
                type="number"
                min="0"
                step={m.type === "count" ? "1" : "0.1"}
                placeholder="0"
                value={values[m.key] ?? ""}
                onChange={(e) => setValues({ ...values, [m.key]: e.target.value })}
              />
            ))}
          </div>

          <label className="block">
            <span className="block text-xs text-mute mb-1.5">
              Note (optional, {280 - note.length} left)
            </span>
            <textarea
              className="w-full bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition resize-none"
              rows={2}
              maxLength={280}
              placeholder="What did you work on?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full" disabled={busy}>
            {busy ? "Saving…" : "Save contribution"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
