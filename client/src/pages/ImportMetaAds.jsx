import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { errMsg, API_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card } from "../components/ui";
import { formatMetric } from "../config/roles";
import { Icon } from "../components/icons";

// Excel showcase: upload -> preview -> confirm. The "verification
// ladder" rung two, live on stage.
export default function ImportMetaAds() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [state, setState] = useState({ step: "pick" }); // pick | preview
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState("");

  async function upload(file) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    setFileName(file.name);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post("/import/meta-ads/preview", fd);
      setState({ step: "preview", ...r.data });
    } catch (err) {
      setError(errMsg(err, "Upload failed"));
      setState({ step: "pick" });
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/import/meta-ads/confirm", { rows: state.rows });
      navigate("/dashboard", {
        state: { popDate: state.rows[state.rows.length - 1]?.date },
      });
      void r;
    } catch (err) {
      setError(errMsg(err, "Import failed"));
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2.5">
        <Icon name="target" size={22} className="text-brand" /> Import Meta Ads report
      </h1>
      <p className="text-sm text-mute mb-6">
        Upload your exported report and every day becomes a{" "}
        <span className="text-blue-300">verified</span> contribution.
      </p>

      <MetaConnectCard />

      {state.step === "pick" && (
        <Card>
          <div
            className="border-2 border-dashed border-line rounded-xl p-10 text-center cursor-pointer hover:border-mute transition"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              upload(e.dataTransfer.files?.[0]);
            }}
          >
            <Icon name="upload" size={32} className="text-mute mb-3" strokeWidth={1.4} />
            <p className="font-medium text-sm">
              {busy ? "Parsing…" : "Drop your .xlsx or .csv here or click to browse"}
            </p>
            <p className="text-xs text-mute mt-1">Max 2MB · .xlsx or .csv</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </div>
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
          <p className="text-xs text-mute mt-4 text-center">
            Wrong format?{" "}
            <a
              href={`${API_URL}/api/import/meta-ads/template`}
              className="text-brand hover:underline"
            >
              Download the template
            </a>
          </p>
        </Card>
      )}

      {state.step === "preview" && (
        <Card>
          <h2 className="font-semibold text-sm mb-1">Ready to import</h2>
          <p className="text-xs text-mute mb-4">
            {fileName} · {state.skipped > 0 && `${state.skipped} rows skipped · `}
            nothing is saved until you confirm
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <PreviewStat label="Days of history" value={state.preview.days} />
            <PreviewStat
              label="Date range"
              value={`${state.preview.from} → ${state.preview.to}`}
              small
            />
            <PreviewStat label="Total leads" value={formatMetric(state.preview.totalLeads, "count")} />
            <PreviewStat label="Campaigns" value={state.preview.totalCampaigns} />
            <PreviewStat label="Total spend" value={formatMetric(state.preview.totalSpend, "currency")} />
            <PreviewStat label="Avg ROAS" value={`${state.preview.avgRoas}x`} />
          </div>

          {error && <p className="text-sm text-red-400 mb-3">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={confirm} disabled={busy} className="flex-1">
              {busy ? "Importing…" : `Import ${state.preview.days} verified days`}
            </Button>
            <button
              onClick={() => setState({ step: "pick" })}
              className="text-sm text-mute hover:text-ink px-4"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-mute mt-3">
            Re-importing replaces your previous import. No duplicates, ever.
          </p>
        </Card>
      )}
    </div>
  );
}

// Rung three of the verification ladder: live Meta API sync.
// Works in Meta dev-mode against your own ad account.
function MetaConnectCard() {
  const { user, saveUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState(
    params.get("meta") === "error" ? decodeURIComponent(params.get("reason") || "Connection failed") : ""
  );

  // after the OAuth redirect lands back here, refresh the user
  useEffect(() => {
    if (params.get("meta") === "connected") {
      api.get("/auth/me").then((r) => {
        saveUser(r.data.user);
        setMsg("Meta account connected. Hit Sync to pull your last 90 days.");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.get("/meta/oauth-url");
      window.location.href = r.data.url;
    } catch (err) {
      setError(errMsg(err, "Meta connect failed"));
      setBusy(false);
    }
  }

  async function sync() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/meta/sync");
      const me = await api.get("/auth/me");
      saveUser(me.data.user);
      setMsg(`Synced ${r.data.synced} days from ${r.data.account}.`);
      setTimeout(() => navigate("/dashboard"), 900);
    } catch (err) {
      setError(errMsg(err, "Sync failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4 border-emerald-500/30">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Icon name="zap" size={14} className="text-emerald-300" /> Live Meta API sync
            <span className="text-[10px] font-normal text-emerald-300 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-2 py-0.5">
              no manual entry
            </span>
          </h2>
          <p className="text-xs text-mute mt-1">
            {user.metaConnected
              ? `Connected to ${user.metaAccountName}${
                  user.metaLastSyncAt
                    ? ` · last sync ${new Date(user.metaLastSyncAt).toLocaleString()}`
                    : " · never synced"
                }`
              : "Connect your ad account and contributions sync straight from Meta, fully verified."}
          </p>
        </div>
        {user.metaConnected ? (
          <Button onClick={sync} disabled={busy}>
            {busy ? "Syncing…" : <><Icon name="zap" size={13} /> Sync last 90 days</>}
          </Button>
        ) : (
          <Button onClick={connect} disabled={busy}>
            {busy ? "Redirecting…" : "Connect Meta account"}
          </Button>
        )}
      </div>
      {msg && <p className="text-xs text-emerald-300 mt-2">{msg}</p>}
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </Card>
  );
}

function PreviewStat({ label, value, small }) {
  return (
    <div className="bg-bg border border-line rounded-lg p-3">
      <div className={`font-bold ${small ? "text-xs" : "text-lg"} text-blue-300`}>
        {value}
      </div>
      <div className="text-[10px] text-mute mt-0.5">{label}</div>
    </div>
  );
}
