// Floating site-helper bot — bottom-right on every page. Answers
// "how does Proofly work?" questions via /api/ai/assistant and
// offers page links as tap-able chips.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api, { errMsg } from "../api/client";

const QUICK_QUESTIONS = [
  "How does Proofly work?",
  "How is my score calculated?",
  "How do I verify my work?",
  "How do I share my profile?",
];

const HELLO = {
  from: "bot",
  text: "Hi! I'm the Proofly guide — ask me anything about how the site works, or tap a question below.",
  links: [],
};

function ChatIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-8 8H5a2 2 0 0 1-2-2v-6a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
    </svg>
  );
}

function Bubble({ msg, onNavigate }) {
  const isUser = msg.from === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-brand text-ink rounded-br-md"
            : "bg-card2 border border-line text-ink rounded-bl-md"
        }`}
      >
        {msg.text}
        {msg.links?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {msg.links.map((l) => (
              <Link
                key={l.to + l.label}
                to={l.to}
                onClick={onNavigate}
                className="text-xs px-2.5 py-1 rounded-full border border-brand/50 text-brand hover:bg-brand/10 transition"
              >
                {l.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([HELLO]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(text) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    const history = messages.slice(-8).map(({ from, text }) => ({ from, text }));
    setMessages((m) => [...m, { from: "user", text: message }]);
    setBusy(true);
    try {
      const r = await api.post("/ai/assistant", { message, history });
      setMessages((m) => [...m, { from: "bot", text: r.data.reply, links: r.data.links }]);
    } catch (err) {
      setMessages((m) => [...m, { from: "bot", text: errMsg(err, "I hiccuped — try again?") }]);
    } finally {
      setBusy(false);
    }
  }

  // hide on the print-focused résumé page
  if (location.pathname.endsWith("/resume")) return null;

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 w-[min(22rem,calc(100vw-2.5rem))] flex flex-col bg-card border border-line rounded-2xl shadow-2xl shadow-black/50 overflow-hidden no-print">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-line bg-card2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <div>
              <div className="text-sm font-semibold">Proofly Guide</div>
              <div className="text-[11px] text-mute">Ask anything about the site</div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 p-3.5 h-80 overflow-y-auto">
            {messages.map((msg, i) => (
              <Bubble key={i} msg={msg} onNavigate={() => setOpen(false)} />
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-line text-mute hover:text-ink hover:border-brand/50 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {busy && <div className="text-xs text-mute pl-1 animate-pulse">typing…</div>}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 p-3 border-t border-line"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Proofly…"
              maxLength={500}
              className="flex-1 bg-card2 border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand/60 placeholder:text-mute"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-brand text-ink rounded-lg px-3 py-2 text-sm font-medium hover:bg-[#d0764c] disabled:opacity-40 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close site guide" : "Open site guide"}
        className="fixed bottom-5 right-5 z-50 w-13 h-13 p-3.5 rounded-full bg-brand text-ink shadow-lg shadow-black/40 hover:bg-[#d0764c] active:scale-95 transition no-print"
      >
        <ChatIcon open={open} />
      </button>
    </>
  );
}
