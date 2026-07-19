# Proofly API Reference

Everything the backend exposes, in one place. Written for frontend integration.

- **Base URL**: `http://localhost:5001/api` (production: set `VITE_API_URL` to the Render URL)
- **Auth**: JWT. `register`/`login` return a `token` — send it on every protected call:
  `Authorization: Bearer <token>`. Tokens live 7 days.
- **Errors**: always JSON — `{ "error": "message" }`, and form errors add the field:
  `{ "error": "Valid email required", "field": "email" }`. Map `field` to the right input.
- **Dates**: always `"yyyy-mm-dd"` strings, both directions. Never send Date objects or ISO timestamps.
- **429**: auth routes allow 20 requests / 10 min per IP, support form 5 / 15 min. On 429 show the
  `error` message and disable the button for a bit.

Route protection levels used below:

| Tag | Meaning |
|---|---|
| public | no token needed |
| auth | token required |
| auth+role | token + user must have chosen a profession |
| admin | token + `isAdmin` (set via `npm run make-admin -- email`) |

---

## Meta

### `GET /health` — public
`{ "ok": true }` — use to pre-warm the Render server before a demo.

### `GET /roles` — public
Full role config: labels, colors, icons, and each role's metrics (`key`, `label`, `type`, `weight`).
**Drive the log-activity form, dashboard labels and colors entirely from this** — never hardcode metrics.

### `GET /site` — public
`{ about: {title, tagline, story}, team: [{name, title, github, linkedin}], supportTopics: [...] }`
— renders the About, Team and Support pages. Content lives in `src/config/site.js`.

---

## Auth

### `POST /auth/register` — public
Body: `{ name, email, password, username }`
- username: 3-20 chars, `a-z 0-9 - _` (server lowercases)
- password: 6+ chars
- 201 → `{ token, user }` · 409 → duplicate email/username (has `field`)

### `POST /auth/login` — public
Body: `{ email, password }` → `{ token, user }` · 401 on bad credentials.

### `GET /auth/me` — auth
`{ user }` — call on app load to restore the session.

### `POST /auth/change-password` — auth
Body: `{ currentPassword, newPassword }` → `{ ok: true }` · 401 if current is wrong.

The `user` object everywhere:
```json
{
  "id": "...", "name": "...", "email": "...", "username": "...",
  "role": "developer" | null, "headline": "...",
  "githubUsername": "", "emailReminders": true, "isAdmin": false
}
```
`role === null` → route the user to the choose-role screen.
`isAdmin === true` → show the admin section link.

---

## Users

### `PUT /users/role` — auth
Body: `{ role: "developer" }` — **locked after first choice**, 400 if already set.

### `PUT /users/profile` — auth
Body (all optional): `{ name, headline, emailReminders }` → `{ user }`.
`emailReminders: false` opts out of reminder/digest emails.

### Streak freezes — `GET /users/streak-freezes` (auth), `POST /users/streak-freeze` (auth+role)
Duolingo-style insurance: a freeze covers ONE missed day so it doesn't break the streak.
- GET → `{ frozen: ["2026-07-17"], remaining: 1 }` (2 per calendar month)
- POST body: `{ date: "2026-07-17" }` — must be within the last 7 days, not logged, not already frozen.
- Frozen days bridge the streak everywhere (summary, leaderboard, card) but add **no** activity/score.
- UI idea: when the heatmap shows a 1-day gap breaking a big streak, offer "Use a freeze?".

---

## Contributions — all auth+role

### `POST /contributions`
```json
{ "date": "2026-07-18", "metrics": { "commit": 5, "pull_request": 1 },
  "note": "optional, 280 max", "evidenceUrl": "https://github.com/x/y/pull/42" }
```
- `metrics` keys must belong to the user's role (from `/roles`); unknown keys are dropped server-side.
- date: today or up to 30 days back, no future dates.
- **`evidenceUrl` (optional)**: any http(s) link. If present, the entry is saved with
  `verification: "evidence"` — show the 📎 badge. Without it: `self_reported`.
- 201 → `{ contribution }` · 400 with message if date/metrics invalid.

### `GET /contributions?limit=30&date=2026-07-18` (limit max 100, date optional)
`{ contributions: [...] }` newest first. `date` filters to a single day — used by the
dashboard's Today/Yesterday/pick-a-date filter. Each entry has `date, metrics, weightedTotal,
note, verification, source, evidenceUrl`.

### `PUT /contributions/:id/evidence`
Body: `{ evidenceUrl }` — attach proof later. Upgrades `self_reported → evidence`
(`imported` stays `imported`, it's a higher rung). 400 on a non-http(s) link.

### `DELETE /contributions/:id`
Owner-scoped. `{ ok: true }` · 404 if not yours/not found.

`verification` values for badges in the UI:
- `self_reported` — plain badge
- `evidence` — 📎 has a proof link (render `evidenceUrl` as a link)
- `imported` — ✓ came from Excel import or GitHub sync (strongest)

---

## Stats — all auth+role (the user's own data)

### `GET /stats/heatmap`
`{ days: [{ date, total, level }] }` — level 0-4, already percentile-scaled per user. Just paint.

### `GET /stats/summary`
```json
{ "summary": { "activeDays": 42, "currentStreak": 7, "longestStreak": 21, "score": 180,
  "metricTotals": { "commit": 320, ... }, "totalContributions": 60, "verifiedCount": 18 } }
```
`verifiedCount / totalContributions` = the "X% verified" stat.

### `GET /stats/badges`
`{ badges: [{ key, icon, label, desc, earned }] }` — all 9, render earned vs locked (grey out locked).

### `GET /stats/insights`
The dashboard "this week" panel — everything precomputed:
```json
{ "thisWeek": { "activeDays": 4, "weightedTotal": 62, "metrics": { "commit": 21 } },
  "lastWeek": { "activeDays": 3, "weightedTotal": 40 },
  "changePct": 55, "bestDay": { "date": "2026-07-15", "total": 30 },
  "daysSinceLastLog": 0, "currentStreak": 7,
  "nudges": ["You're up 55% on last week — keep pushing."] }
```
- rolling 7-day windows, `changePct` is null when last week was empty.
- `nudges` are ready-made strings — render them as banner(s) as-is.

---

## Goals — all auth+role

Weekly targets per metric, progress resets every **Monday**.

- `GET /goals` → `{ goals: [{ metricKey, label, weeklyTarget, progress, pct }] }` — `pct` capped at 100, draw the bar directly.
- `PUT /goals` body `{ metricKey: "commit", weeklyTarget: 10 }` — creates or updates. Metric must belong to the user's role.
- `DELETE /goals/:metricKey`

---

## GitHub integration — auth+role, **developer role only** (others get 403)

GitHub syncing is **repo-based** — repos are added via `POST /connections { type: "github_repo" }`
(see Connections above). The username here is only the **author filter**: in a shared repo,
only commits authored by this username count.

- `PUT /integrations/github` body `{ username }` — validates the account exists (404 if not),
  saves it, and **re-syncs every connected repo** with the new filter →
  `{ githubUsername, resynced }`.
- `DELETE /integrations/github` — clears the username + removes legacy `github_sync` entries.
- `user.githubUsername` (from `/auth/me`) tells you the current filter.
- (The old profile-events sync — `POST /integrations/github/sync` — is retired; repos via
  Connections replaced it.)

---

## Connections — auth+role (the "connect once, we track daily" system)

Free auto-sync sources. Every synced entry is `verification: "imported"`, `source: "connection"`,
tagged with its connection id — re-sync and disconnect replace/remove exactly their own rows.
A daily 03:30 job re-syncs everything automatically.

- `GET /connections` → `{ connections: [{ _id, type, label, lastSyncAt, lastSynced }] }`
- `POST /connections` — body per type, syncs immediately, returns `{ connection, synced }`:
  - `{ type: "github_repo", repo: "owner/name" }` — public repos only; commits counted daily
    (filtered by the user's connected `githubUsername` when set)
  - `{ type: "sheet", url: "<google sheet link>" }` — sheet must be link-shared or published;
    columns: `date` + metric labels/keys (validated at connect time)
  - `{ type: "youtube", url: "<link with UC… channel id>" }` — roles with a `video` metric only
- `POST /connections/:id/sync` → `{ synced }` — manual refresh
- `DELETE /connections/:id` — disconnect + remove its synced entries
- `GET /connections/sheet-template` → CSV download with the right columns for the user's role
- Max 10 connections per user. Friendly 400 errors on bad repo/sheet/channel.
- Optional env: `GITHUB_TOKEN` raises the GitHub rate limit 60 → 5000 req/hr.

---

## Export — auth+role

### `GET /export/profile`
Downloads a self-contained **HTML proof-of-work report** (stats, graph, badges, verification
breakdown, work log with proof links). Print-friendly — browser Ctrl+P gives a clean PDF.

### `GET /export/data`
Full JSON takeout: profile, summary, all contributions, goals, freezes.

Both send `Content-Disposition: attachment` — fetch as blob and trigger a download:
```js
const r = await api.get("/export/profile", { responseType: "blob" });
const url = URL.createObjectURL(r.data);
const a = Object.assign(document.createElement("a"), { href: url, download: "proofly-report.html" });
a.click();
URL.revokeObjectURL(url);
```

---

## Public — no auth, safe to hit from anywhere

### `GET /public/:username`
Everything for the public profile page in one call:
`{ profile: {name, username, headline, role, joined}, summary, badges (earned only),
heatmap: [...], recent: [last 10 entries incl. evidenceUrl] }`
404 if the user doesn't exist **or** never chose a role (same response on purpose).

### `GET /public/:username/card.svg`
The embeddable card (640×196 SVG, cached 1h). Marketing line for users:
```html
<img src="https://<api-host>/api/public/<username>/card.svg" alt="My Proofly proof-of-work">
```
Show this snippet on the profile page with a copy button.

### `GET /public/search?role=sales&q=priya&minStreak=7`
All params optional. `{ results: [{ name, username, headline, role, currentStreak,
longestStreak, activeDays }] }` — top 20, ranked by streak. This is the recruiter discovery page.

### `GET /leaderboard?role=developer`
`role` **required**. Top 20: `{ leaderboard: [{ name, username, headline, currentStreak,
longestStreak, activeDays, weightedSum }] }`.

---

## Support

### `POST /support` — public (rate limit 5 / 15 min)
Body: `{ name, email, topic, message }` — `topic` one of `/site`'s `supportTopics`.
**If the user is logged in, send the token** — then `name`/`email` are optional (pulled from
the account) and the ticket links to them. → 201 `{ ticket: { id, status, createdAt } }`

### `GET /support/mine` — auth
`{ tickets: [{ topic, message, status, createdAt }] }` — the user's own tickets only.

---

## Admin — token + isAdmin

Promote an admin (one-time, from terminal): `npm run make-admin -- vipul@email.com`

- `GET /admin/overview` → `{ users, contributions, openTickets }`
- `GET /admin/users` → up to 200 users, never includes password hashes
- `GET /admin/tickets?status=open|closed` → all tickets
- `PUT /admin/tickets/:id` body `{ status: "closed" }` → resolve a ticket

Non-admins get 403 on all of these — hide the section when `user.isAdmin` is false.

---

## Background jobs (server-side, nothing to call)

| When | What |
|---|---|
| daily 03:00 | re-sync every connected GitHub account |
| daily 18:00 | "streak at risk" email to users with a 3+ streak who haven't logged today |
| Monday 08:00 | weekly digest email |

Emails only go out if SMTP env vars are set (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `EMAIL_FROM`); without them the jobs are silently off. Users opt out via
`PUT /users/profile { emailReminders: false }`.

---

## Suggested integration order

1. `/roles` + `/site` on app boot (both cacheable, no auth)
2. Auth flow → store token → `/auth/me` on reload
3. Dashboard: `/stats/summary` + `/stats/heatmap` + `/stats/insights` (parallel)
4. Log activity form from role config → `POST /contributions` (with optional evidence field)
5. Public profile + card embed snippet + leaderboard + search
6. Goals, streak freeze, GitHub connect (developer settings), export buttons
7. Support form + admin panel
