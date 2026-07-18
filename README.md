# ✅ Proofly — GitHub for Every Profession

A public proof-of-work profile for every professional. Developers have GitHub;
now sales, marketing, HR, ads and design professionals get a contribution graph too.

**Core thesis: we rank consistency, not claims — you can't fake showing up every day.**

## Stack

React (Vite) · Tailwind v4 · React Router · Axios · Node/Express · MongoDB/Mongoose · JWT · Multer + XLSX

## Run locally

```bash
# API  (needs MongoDB running locally, or set MONGO_URI to Atlas)
cd server
npm install
npm run seed     # 8 demo users with months of history — REQUIRED for a good demo
npm run dev      # http://localhost:5001

# Client
cd client
npm install
npm run dev      # http://localhost:5173 (or 5174)
```

## Demo accounts

All passwords: `demo1234`

| Login | Role | Why it matters |
|---|---|---|
| `arjun@proofly.demo` | Developer | 🔥 132-day streak hero — open `/u/arjun` first |
| `rahul@proofly.demo` | Meta Ads | Has ✓ verified imported history |
| `priya@proofly.demo` | Sales | Second profile to show role-switching of metrics |

Live import demo file: `demo-assets/meta-ads-report.xlsx`
(86 rows, 2 intentionally-broken rows to show "skipped" handling).

## Demo script (3 min)

1. Open a real GitHub profile + `/u/arjun` side by side — "recruiters trust this
   for developers; nobody else has one."
2. Open `/u/priya` — same graph, sales metrics. Roles are config, not code.
3. Live: log in as any user → Log Activity → save → **today's square pops on
   the heatmap** (applause moment).
4. Log in as `rahul` → Import → upload `demo-assets/meta-ads-report.xlsx` →
   preview ("84 days, 1,536 leads, 2 rows skipped") → confirm → graph floods
   with ✓ Verified entries. "Self-reported is rung one of the verification
   ladder. This is rung two. Direct API integrations are rung three — that's
   the company."
5. Leaderboard — "ranked by streak, not by claimed revenue. Consistency is
   game-resistant."

## Deploy (H16 of the plan, not H23)

- **API → Render**: root `server/`, build `npm install`, start `npm start`.
  Env: `MONGO_URI` (Atlas), `JWT_SECRET`, `CLIENT_URL` (Vercel URL).
- **Client → Vercel**: root `client/`, framework Vite.
  Env: `VITE_API_URL` = Render URL. `vercel.json` already handles SPA rewrites.
- **Atlas**: allow `0.0.0.0/0` (demo cluster), run `npm run seed` once with
  `MONGO_URI` pointed at Atlas.
- **Before going on stage**: hit `<render-url>/api/health` from your phone —
  Render free tier cold-starts in ~50s and that kills more demos than bugs do.

## AI Career Summary (hackathon "AI fluency" feature)

Public profiles have a ✨ AI Career Summary card: the model reads the user's
LOGGED PROOF (streaks, metric totals, recent entries) and writes a
recruiter-ready summary + 3 highlight chips. Cached on the user, regenerate on
demand. Setup: paste `OPENAI_API_KEY` into `server/.env` (model defaults to
`gpt-4o-mini`, override with `OPENAI_MODEL`).

## Live Meta Ads sync (verification ladder rung 3)

Meta Ads users can OAuth-connect their real ad account; daily insights
(leads, spend, ROAS, CTR) from the last 90 days sync as `⚡ Synced from Meta
API` contributions. Idempotent re-sync, disconnect wipes synced rows.

Dev-mode setup (no App Review needed for your own account):
1. developers.facebook.com → Create App (type: Business).
2. Add product "Facebook Login" → Settings → Valid OAuth Redirect URIs:
   `http://localhost:5001/api/meta/callback` (add the Render URL variant
   after deploy, and update `META_REDIRECT_URI`).
3. App stays in **Development Mode**. The Facebook account that owns the ad
   account (your digital marketer) must be added under App Roles →
   Administrators/Developers — dev-mode apps can only read data for app roles.
4. Copy App ID + App Secret into `server/.env`
   (`META_APP_ID`, `META_APP_SECRET`).
5. In Proofly: Import page → Connect Meta account → log in AS THE MARKETER'S
   Facebook account → Sync last 90 days.

## Architecture notes (for judges)

- **Professions are data, not code** — `server/src/config/roles.js` drives the
  logging form, dashboard, heatmap weighting, score and leaderboard. Adding a
  7th profession is ~10 lines of config, zero code.
- **Dates are `yyyy-mm-dd` strings end-to-end** — kills the entire class of
  timezone/heatmap-off-by-one bugs.
- **Verification ladder** on every contribution:
  `self_reported → evidence → imported` (the Excel flow is rung two;
  API integrations are the roadmap).
- **Heatmap levels are per-user percentiles**, not linear — every active user
  gets a rich graph regardless of scale.
- **Streak > score** — the number we make biggest is the one you can't fake.
