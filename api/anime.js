import { anilistGraphql } from "./lib/anilistClient.js";

const detailCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = parseInt(req.query.id ?? "", 10);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid anime id" });
  }

  const cached = detailCache.get(id);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return res.status(200).json({ media: cached.media });
  }

  try {
    const data = await anilistGraphql({
      query: `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            coverImage { large extraLarge }
            bannerImage
            description(asHtml: false)
            status
            episodes
            season
            seasonYear
            format
            duration
            source
            meanScore
            genres
            nextAiringEpisode { episode airingAt }
            studios(isMain: true) {
              nodes { name }
            }
            tags {
              rank
              name
              description
            }
            recommendations(perPage: 8, sort: RATING_DESC) {
              nodes {
                rating
                mediaRecommendation {
                  id
                  title { romaji english }
                  coverImage { large }
                  meanScore
                }
              }
            }
          }
        }
      `,
      variables: { id },
    });

    const media = data?.data?.Media;
    if (!media) {
      return res.status(404).json({ error: "Anime not found" });
    }

    detailCache.set(id, { at: Date.now(), media });
    return res.status(200).json({ media });
  } catch (err) {
    const rateLimited = err.code === "rate_limited" || err.status === 429;
    return res.status(rateLimited ? 429 : 502).json({
      error: rateLimited
        ? "Details temporarily unavailable. Try again shortly."
        : err.message || "Failed to load anime",
      rateLimited,
    });
  }
}
