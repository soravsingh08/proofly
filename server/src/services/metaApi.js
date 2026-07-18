// ============================================================
// Meta (Facebook) Marketing API — dev-mode integration.
// Rung THREE of the verification ladder: contributions synced
// straight from the platform, no human in the loop.
//
// Dev-mode note: an app in Development Mode can read ads data
// for its own admins/testers WITHOUT App Review — perfect for
// a hackathon demo on your own ad account.
// ============================================================

const GRAPH = "https://graph.facebook.com/v19.0";

export function metaConfigured() {
  return Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function oauthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID,
    redirect_uri: process.env.META_REDIRECT_URI,
    state,
    scope: "ads_read",
    response_type: "code",
  });
  return `https://www.facebook.com/v19.0/dialog/oauth?${params}`;
}

async function graphGet(path, params) {
  const url = `${GRAPH}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.message || `Graph API error (${res.status})`;
    console.error("meta graph error:", path, msg);
    throw new Error(msg);
  }
  return data;
}

// code -> short-lived token -> long-lived token (~60 days)
export async function exchangeCode(code) {
  const short = await graphGet("/oauth/access_token", {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: process.env.META_REDIRECT_URI,
    code,
  });
  const long = await graphGet("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: short.access_token,
  });
  return long.access_token;
}

export async function firstAdAccount(accessToken) {
  const data = await graphGet("/me/adaccounts", {
    fields: "id,name",
    limit: 5,
    access_token: accessToken,
  });
  if (!data.data?.length) throw new Error("No ad accounts on this Meta user");
  return { id: data.data[0].id, name: data.data[0].name || data.data[0].id };
}

// Daily account-level insights for the last 90 days.
// Returns rows shaped like our contribution metrics.
export async function dailyInsights(adAccountId, accessToken) {
  const data = await graphGet(`/${adAccountId}/insights`, {
    time_increment: 1,
    date_preset: "last_90d",
    fields: "spend,ctr,purchase_roas,actions",
    limit: 500,
    access_token: accessToken,
  });

  const rows = [];
  for (const day of data.data || []) {
    const leadsAction = (day.actions || []).find((a) =>
      a.action_type?.includes("lead")
    );
    const metrics = {
      leads: Number(leadsAction?.value) || 0,
      spend: Math.round(Number(day.spend) || 0),
      roas: +(Number(day.purchase_roas?.[0]?.value) || 0).toFixed(1),
      ctr: +(Number(day.ctr) || 0).toFixed(1),
    };
    // skip days with no activity at all
    if (!metrics.leads && !metrics.spend) continue;
    rows.push({ date: day.date_start, metrics });
  }
  return rows;
}
