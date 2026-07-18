// GitHub helper — repo syncing lives in services/connections.js;
// this only validates the author-filter username against the API.
const HEADERS = { "User-Agent": "proofly", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

export async function githubUserExists(username) {
  const r = await fetch(`https://api.github.com/users/${username}`, { headers: HEADERS });
  return r.ok;
}
