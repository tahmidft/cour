const ANILIST_URL = "https://graphql.anilist.co";
const MIN_GAP_MS = 400;
// Module-level — shared across requests within the same serverless instance lifetime
let lastRequestAt = 0;

export function isRateLimited(data, status) {
  if (status === 429) return true;
  return data?.errors?.some(
    (e) => e.status === 429 || /too many/i.test(e.message ?? "")
  );
}

export async function anilistGraphql(body) {
  const now = Date.now();
  const wait = Math.max(0, MIN_GAP_MS - (now - lastRequestAt));
  if (wait) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (isRateLimited(data, res.status)) {
    const err = new Error("AniList rate limit");
    err.code = "rate_limited";
    err.status = 429;
    throw err;
  }

  return data;
}
