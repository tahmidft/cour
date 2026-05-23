import { getDiscoverBatch } from "./lib/discover.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const idsParam = req.query.ids ?? "";
  const anilistIds = idsParam
    ? idsParam
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n))
    : [];

  const minRating = Math.max(40, Math.min(100, parseInt(req.query.minRating ?? "70", 10)));
  const excludeParam = req.query.exclude ?? "";
  const excludeIds = new Set(
    excludeParam
      ? excludeParam
          .split(",")
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n))
      : []
  );

  const trackedIds = new Set();
  const trackedParam = req.query.tracked ?? "";
  for (const id of (trackedParam ? trackedParam.split(",") : [])) {
    const n = parseInt(id.trim(), 10);
    if (!Number.isNaN(n)) {
      trackedIds.add(n);
      excludeIds.add(n);
    }
  }

  try {
    const { results, remainingAfterBatch } = await getDiscoverBatch(
      anilistIds,
      minRating,
      excludeIds,
      trackedIds,
      24
    );
    const nextMinRating = minRating > 40 ? Math.max(40, minRating - 15) : null;
    const hasMore =
      (minRating > 40 && (results.length > 0 || remainingAfterBatch > 0)) ||
      (minRating === 40 && remainingAfterBatch > 0);

    return res.status(200).json({
      results,
      minRating,
      nextMinRating,
      hasMore,
    });
  } catch (err) {
    const rateLimited = err.code === "rate_limited" || err.status === 429;
    return res.status(rateLimited ? 429 : 502).json({
      error: rateLimited
        ? "Discover is temporarily rate limited. Try again in a few seconds."
        : err.message || "Failed to load recommendations",
      rateLimited,
      results: [],
    });
  }
}
