const ANILIST_URL = "https://graphql.anilist.co";

export async function searchAnime(query) {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query ($search: String) {
          Page(perPage: 10) {
            media(search: $search, type: ANIME) {
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
            }
          }
        }
      `,
      variables: { search: query },
    }),
  });
  const data = await res.json();
  return data.data?.Page?.media ?? [];
}

export async function getAnimeById(id) {
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
            recommendations(perPage: 8) {
              nodes {
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
