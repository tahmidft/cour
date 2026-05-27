import { anilistGraphql } from "./anilistClient.js";

const poolCache = new Map();
const POOL_TTL_MS = 10 * 60 * 1000;

const REC_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  status
  episodes
  seasonYear
  genres
  meanScore
`;

async function fetchMediaWithRecs(anilistId) {
  const data = await anilistGraphql({
    query: `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          recommendations(perPage: 50, sort: RATING_DESC) {
            nodes {
              rating
              mediaRecommendation {
                ${REC_FIELDS}
              }
            }
          }
        }
      }
    `,
    variables: { id: anilistId },
  });

  return data?.data?.Media?.recommendations?.nodes ?? [];
}

async function fetchTopAiring() {
  const data = await anilistGraphql({
    query: `
      query {
        Page(perPage: 24) {
          media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
            ${REC_FIELDS}
          }
        }
      }
    `,
  });
  return (data?.data?.Page?.media ?? []).map((m) => ({ media: m, rating: 100 }));
}

export async function buildDiscoverPool(anilistIds, trackedIds = new Set()) {
  const key = anilistIds.length ? anilistIds.slice().sort((a, b) => a - b).join(",") : "top";
  const cached = poolCache.get(key);
  if (cached && Date.now() - cached.at < POOL_TTL_MS) {
    return cached.pool;
  }

  const entries = new Map();

  if (!anilistIds.length) {
    const top = await fetchTopAiring();
    for (const item of top) {
      if (item.media?.id && !trackedIds.has(item.media.id)) {
        entries.set(item.media.id, item);
      }
    }
  } else {
    for (const id of anilistIds.slice(0, 8)) {
      try {
        const nodes = await fetchMediaWithRecs(id);
        for (const node of nodes) {
          const rec = node.mediaRecommendation;
          if (!rec?.id || trackedIds.has(rec.id)) continue;
          const existing = entries.get(rec.id);
          if (!existing || node.rating > existing.rating) {
            entries.set(rec.id, { media: rec, rating: node.rating ?? 0 });
          }
        }
      } catch {
        /* skip show on error */
      }
    }
  }

  const pool = [...entries.values()].sort((a, b) => b.rating - a.rating);
  poolCache.set(key, { at: Date.now(), pool });
  return pool;
}

/**
 * @param {number[]} anilistIds
 * @param {number} minRating - minimum AniList recommendation % (0–100)
 * @param {Set<number>} excludeIds - already shown
 * @param {number} limit
 */
export async function getDiscoverBatch(
  anilistIds,
  minRating,
  excludeIds,
  trackedIds,
  limit = 24
) {
  const pool = await buildDiscoverPool(anilistIds, trackedIds);
  const batch = pool
    .filter(({ media, rating }) => rating >= minRating && !excludeIds.has(media.id))
    .slice(0, limit);

  const remaining = pool.filter(
    ({ media, rating }) => rating >= minRating && !excludeIds.has(media.id)
  ).length;

  return {
    results: batch.map(({ media, rating }) => ({ ...media, similarity: rating })),
    remainingAfterBatch: Math.max(0, remaining - batch.length),
  };
}
