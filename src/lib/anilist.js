const ANILIST_URL = "https://graphql.anilist.co";

/**
 * Search via /api/search (cached, rate-limit friendly) when available.
 * Falls back to direct implementation for local dev without `vercel dev`.
 */
export async function searchAnime(query) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
    const data = await res.json().catch(() => ({}));

    if (res.status === 429) {
      throw new Error(data.error || "Search is temporarily rate limited. Try again shortly.");
    }
    if (res.ok && Array.isArray(data.results)) {
      return data.results;
    }
  } catch (err) {
    if (err.message?.includes("rate limit")) throw err;
  }

  const { searchAnimeImpl } = await import("../../api/lib/animeSearch.js");
  return searchAnimeImpl(trimmed);
}

export async function getAnimeById(id) {
  try {
    const res = await fetch(`/api/anime?id=${id}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.media) return data.media;
  } catch {
    /* fallback */
  }

  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            coverImage { large extraLarge }
            bannerImage
            status
            episodes
            season
            seasonYear
            nextAiringEpisode { episode airingAt }
            genres
            meanScore
            recommendations(perPage: 8, sort: RATING_DESC) {
              nodes {
                rating
                mediaRecommendation {
                  id
                  title { romaji native english }
                  coverImage { large }
                  genres
                  meanScore
                  status
                }
              }
            }
            relations {
              edges {
                relationType
                node {
                  id
                  title { romaji }
                  status
                  type
                }
              }
            }
          }
        }
      `,
      variables: { id },
    }),
  });
  const data = await res.json();
  return data.data?.Media ?? null;
}

export async function getAiringSchedule() {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query {
          Page(perPage: 50) {
            airingSchedules(notYetAired: false, sort: TIME_DESC) {
              episode
              airingAt
              media {
                id
                title { romaji native }
                coverImage { large }
              }
            }
          }
        }
      `,
    }),
  });
  const data = await res.json();
  return data.data?.Page?.airingSchedules ?? [];
}

export async function getTopAiringAnime() {
  try {
    const res = await fetch("/api/discover?minRating=0&exclude=");
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.results?.length) return data.results;
  } catch {
    /* fallback */
  }

  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query {
          Page(perPage: 12) {
            media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
              id
              title { romaji english native }
              coverImage { large extraLarge }
              status
              episodes
              seasonYear
              genres
              meanScore
            }
          }
        }
      `,
    }),
  });
  const data = await res.json();
  return data.data?.Page?.media ?? [];
}
