import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Button, Card, Spinner } from "../components/ui";
import { Icon } from "../components/icons";
import { toast } from "../components/toast";

const TYPE_META = {
  github_repo: { icon: "github", title: "GitHub repository" },
  sheet: { icon: "table", title: "Google Sheet" },
  youtube: { icon: "play", title: "YouTube channel" },
};

// Connect once, we fetch daily — the "chhod do hum pe" page.
export default function Connections() {
  const { user } = useAuth();
  const role = ROLES[user.role];
  const rootRef = useRef(null);
  const [connections, setConnections] = useState(null);

  const load = useCallback(() => {
    api.get("/connections").then((r) => setConnections(r.data.connections)).catch(() => setConnections([]));
  }, []);

  useEffect(load, [load]);

  useLayoutEffect(() => {
    if (!connections || !rootRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-rise]",
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [connections]);

  if (!connections) return <Spinner label="Loading connections…" />;

  const hasVideoMetric = role.metrics.some((m) => m.key === "video");

  return (
    <div ref={rootRef} className="relative max-w-3xl mx-auto px-4 py-10">
      <div data-rise>
        <h1 className="text-2xl font-bold mb-1">Connections</h1>
        <p className="text-sm text-mute mb-6">
          Connect a source once, we fetch your work every day and log it as{" "}
          <span className="text-blue-300">✓ verified</span>. No more manual entries.
        </p>
      </div>

      {connections.length > 0 && (
        <div data-rise className="space-y-2 mb-6">
          {connections.map((c) => (
            <ConnectionRow key={c._id} conn={c} refresh={load} />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {user.role === "developer" && <RepoCard refresh={load} />}
        {hasVideoMetric && <YoutubeCard refresh={load} />}
        <SheetCard refresh={load} roleLabel={role.label} />
      </div>
    </div>
  );
}

function ConnectionRow({ conn, refresh }) {
  const [busy, setBusy] = useState(false);
  const meta = TYPE_META[conn.type];
  const last = conn.lastSyncAt
    ? new Date(conn.lastSyncAt).toLocaleString("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "never";

  async function sync() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.post(`/connections/${conn._id}/sync`);
      toast(`${conn.label}, synced ${r.data.synced} days`);
      refresh();
    } catch (err) {
      toast(errMsg(err, "Sync failed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Disconnect ${conn.label}? Its synced entries are removed too.`)) return;
    await api.delete(`/connections/${conn._id}`);
    toast(`${conn.label} disconnected`, "info");
    refresh();
  }

  return (
    <div className="flex items-center gap-3 bg-card border border-line rounded-xl px-4 py-3">
      <Icon name={meta.icon} size={16} className="text-brand shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{conn.label}</div>
        <div className="text-[11px] text-mute">
          last synced {last} · {conn.lastSynced} days of activity
        </div>
      </div>
      <button
        onClick={sync}
        disabled={busy}
        className="text-xs border border-line rounded-lg px-3 py-1.5 hover:border-brand transition disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        <Icon name="refresh" size={11} className={busy ? "animate-spin" : ""} />
        {busy ? "Syncing…" : "Sync"}
      </button>
      <button onClick={remove} className="text-mute hover:text-red-400 transition" title="Disconnect">
        <Icon name="x" size={13} />
      </button>
    </div>
  );
}

function SourceCard({ icon, title, hint, children }) {
  return (
    <Card data-rise>
      <h2 className="font-semibold text-sm mb-1 flex items-center gap-2">
        <Icon name={icon} size={15} className="text-brand" /> {title}
      </h2>
      <p className="text-xs text-mute mb-3">{hint}</p>
      {children}
    </Card>
  );
}

function RepoCard({ refresh }) {
  const [repo, setRepo] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (busy || !repo.trim()) return;
    setBusy(true);
    try {
      const r = await api.post("/connections", { type: "github_repo", repo: repo.trim() });
      toast(`${repo.trim()} connected, synced ${r.data.synced} days of commits`);
      setRepo("");
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't connect repo"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SourceCard
      icon="github"
      title="Connect a repository"
      hint="Paste a public repo as owner/name, we count your commits daily. Connect as many repos as you ship to."
    >
      <form onSubmit={add} className="flex gap-2">
        <input
          placeholder="facebook/react"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="flex-1 min-w-0 bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
        />
        <Button className="!px-4 !py-2 text-xs" disabled={busy}>
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </form>
    </SourceCard>
  );
}

function YoutubeCard({ refresh }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (busy || !url.trim()) return;
    setBusy(true);
    try {
      const r = await api.post("/connections", { type: "youtube", url: url.trim() });
      toast(`Channel connected, synced ${r.data.synced} days of uploads`);
      setUrl("");
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't connect channel"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SourceCard
      icon="play"
      title="Connect your YouTube channel"
      hint="Paste a channel link containing the UC… id (youtube.com/channel/UC…), new uploads count as videos."
    >
      <form onSubmit={add} className="flex gap-2">
        <input
          placeholder="https://youtube.com/channel/UC…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 min-w-0 bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
        />
        <Button className="!px-4 !py-2 text-xs" disabled={busy}>
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </form>
    </SourceCard>
  );
}

function SheetCard({ refresh, roleLabel }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (busy || !url.trim()) return;
    setBusy(true);
    try {
      const r = await api.post("/connections", { type: "sheet", url: url.trim() });
      toast(`Sheet connected, synced ${r.data.synced} days of activity`);
      setUrl("");
      refresh();
    } catch (err) {
      toast(errMsg(err, "Couldn't connect sheet"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SourceCard
      icon="table"
      title="Connect a Google Sheet"
      hint={`Works for every role, keep filling your sheet, we fetch and log it daily. The sheet must be shared as "Anyone with the link" or published to the web. Need the column format? Grab the CSV template from your dashboard's Download proof-of-work button.`}
    >
      <form onSubmit={add} className="flex gap-2">
        <input
          placeholder="https://docs.google.com/spreadsheets/d/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 min-w-0 bg-bg border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-brand transition"
        />
        <Button className="!px-4 !py-2 text-xs" disabled={busy}>
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </form>
    </SourceCard>
  );
}
