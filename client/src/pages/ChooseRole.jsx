import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Button } from "../components/ui";
import { Icon } from "../components/icons";

// deterministic pseudo-random cells, tinted per role — a live preview
// of the graph you're choosing (same trick as the landing HeroGraph)
function MiniGraph({ accent, weeks = 13, cell = 8 }) {
  const cells = Array.from({ length: weeks * 7 }, (_, i) => {
    const r = Math.sin(i * 12.9898) * 43758.5453;
    const v = r - Math.floor(r);
    const weekday = i % 7 !== 0 && i % 7 !== 6;
    return v < (weekday ? 0.75 : 0.25) ? Math.ceil(v * 4) : 0;
  });
  return (
    <div
      className="grid grid-rows-7 grid-flow-col gap-[2px]"
      style={{ "--accent": accent }}
    >
      {cells.map((l, i) => (
        <div
          key={i}
          className={`hm-cell hm-${l}`}
          style={{ width: cell, height: cell }}
        />
      ))}
    </div>
  );
}

export default function ChooseRole() {
  const { saveUser } = useAuth();
  const navigate = useNavigate();
  // pre-select the role they clicked on the landing page, if any
  const [selected, setSelected] = useState(() => {
    const r = localStorage.getItem("proofly_role_intent");
    return ROLES[r] ? r : null;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/users/role", { role: selected });
      localStorage.removeItem("proofly_role_intent");
      saveUser(r.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto mt-12 px-4 pb-20">
      <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">
        What do you do?
      </h1>
      <p className="text-sm text-mute text-center mb-10">
        Your profession defines your metrics and the color of your graph.
        This can't be changed later.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLE_KEYS.map((key) => {
          const role = ROLES[key];
          const active = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`text-left bg-card border rounded-2xl p-5 transition ${
                active ? "" : "border-line hover:border-mute"
              }`}
              style={
                active
                  ? { borderColor: role.color, boxShadow: `0 0 0 1px ${role.color}` }
                  : {}
              }
            >
              <div className="flex items-center gap-2.5 mb-4">
                <span
                  className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0"
                  style={{
                    color: role.color,
                    borderColor: `${role.color}55`,
                    background: `${role.color}14`,
                  }}
                >
                  <Icon name={role.icon} size={16} />
                </span>
                <span className="font-semibold text-sm">{role.label}</span>
                {active && (
                  <span className="ml-auto" style={{ color: role.color }}>
                    <Icon name="check" size={16} />
                  </span>
                )}
              </div>
              <div className="overflow-hidden">
                <MiniGraph accent={role.color} />
              </div>
              <div className="text-[11px] text-mute mt-3 leading-snug">
                {role.metrics.map((m) => m.label).join(" · ")}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400 text-center mt-4">{error}</p>}
      <div className="flex justify-center mt-10">
        <Button onClick={confirm} disabled={!selected || busy} className="px-8 py-3">
          {busy
            ? "Saving…"
            : selected
              ? `Continue as ${ROLES[selected].label}`
              : "Select a profession"}
        </Button>
      </div>
    </div>
  );
}
