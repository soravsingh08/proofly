import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES, ROLE_KEYS } from "../config/roles";
import { Button } from "../components/ui";

export default function ChooseRole() {
  const { saveUser } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.put("/users/role", { role: selected });
      saveUser(r.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto mt-12 px-4 pb-16">
      <h1 className="text-2xl font-bold text-center mb-1">What do you do?</h1>
      <p className="text-sm text-mute text-center mb-8">
        Your profession defines your metrics. This can't be changed later.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ROLE_KEYS.map((key) => {
          const role = ROLES[key];
          const active = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={`text-left bg-card border rounded-xl p-4 transition hover:border-mute ${
                active ? "ring-2" : "border-line"
              }`}
              style={active ? { borderColor: role.color, "--tw-ring-color": role.color } : {}}
            >
              <div className="text-2xl mb-2">{role.icon}</div>
              <div className="font-semibold text-sm">{role.label}</div>
              <div className="text-[11px] text-mute mt-1 leading-snug">
                {role.metrics.slice(0, 3).map((m) => m.label).join(" · ")}
              </div>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400 text-center mt-4">{error}</p>}
      <div className="flex justify-center mt-8">
        <Button onClick={confirm} disabled={!selected || busy} className="px-8">
          {busy ? "Saving…" : selected ? `Continue as ${ROLES[selected].label}` : "Select a profession"}
        </Button>
      </div>
    </div>
  );
}
