import { useEffect, useState } from "react";
import { Icon } from "./icons";

let push = null;
const pending = []; // fired before the host mounted — flushed on mount

// fire-and-forget from anywhere: toast("Saved"), toast("Nope", "error")
export function toast(msg, type = "success") {
  if (push) push(msg, type);
  else pending.push([msg, type]);
}

const TYPE_ICON = { success: "check", error: "alert", info: "zap" };

export function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    push = (msg, type) => {
      const id = Date.now() + Math.random();
      setItems((t) => [...t, { id, msg, type }]);
      setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3500);
    };
    if (pending.length) pending.splice(0).forEach(([m, t]) => push(m, t));
    return () => (push = null);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2 pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast-in flex items-center gap-2 border rounded-full px-4 py-2.5 text-sm font-medium shadow-2xl ${
            t.type === "error"
              ? "bg-[#3a1414] border-red-500/50 text-red-200"
              : "bg-brand border-[#e2895f] text-[#1c0e06]"
          }`}
        >
          <Icon
            name={TYPE_ICON[t.type] || "check"}
            size={14}
            className={t.type === "error" ? "text-red-300" : "text-[#1c0e06]"}
          />
          {t.msg}
        </div>
      ))}
    </div>
  );
}
