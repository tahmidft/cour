import { searchAnimeImpl } from "./lib/animeSearch.js";

const CACHE_TTL_MS = 60_000;
const cache = new Map();

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.results;
}

function cacheSet(key, results) {
  cache.set(key, { at: Date.now(), results });
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = (req.query.q ?? req.query.query ?? "").trim();
  if (!q || q.length < 2) {
    return res.status(400).json({ error: "Query must be at least 2 characters" });
  }

  const cacheKey = q.toLowerCase();
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ results: cached, cached: true });
  }

  try {
    const results = await searchAnimeImpl(q);
    cacheSet(cacheKey, results);
    return res.status(200).json({ results });
  } catch (err) {
    if (err.name === "AnimeSearchError" && err.code === "rate_limited") {
      return res.status(429).json({
        error: err.message,
        rateLimited: true,
        results: [],
      });
    }
    return res.status(502).json({
      error: err.message || "Search failed",
      results: [],
    });
  }
}
