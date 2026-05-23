import { anilistGraphql } from "./anilistClient.js";

const TRACK_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  status
  episodes
  seasonYear
  genres
  nextAiringEpisode { episode airingAt }
`;

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function inferAirDay(media) {
  const next = media.nextAiringEpisode;
  if (!next?.airingAt) return null;
  return `Every ${DAY_NAMES[new Date(next.airingAt * 1000).getDay()]}`;
}

export async function fetchAnimeForTrack(anilistId) {
  const data = await anilistGraphql({
    query: `
      query ($id: Int) {
        Media(id: $id, type: ANIME) {
          ${TRACK_FIELDS}
        }
      }
    `,
    variables: { id: anilistId },
  });
  return data?.data?.Media ?? null;
}

export function buildTrackedShowRow(userId, media, seasonNumber) {
  const next = media.nextAiringEpisode;
  return {
    user_id: userId,
    anilist_id: media.id,
    title_en: media.title.english || media.title.romaji,
    title_jp: media.title.native,
    cover_image: media.coverImage?.extraLarge || media.coverImage?.large,
    banner_image: media.bannerImage,
    status: media.status,
    total_episodes: media.episodes,
    last_known_episode: next ? next.episode - 1 : media.episodes || 0,
    episodes_watched: 0,
    next_airing_at: next ? next.airingAt * 1000 : null,
    air_day: inferAirDay(media),
    season_year: media.seasonYear,
    season_number: seasonNumber,
    weekly_reminder: true,
    genres: media.genres?.length ? JSON.stringify(media.genres) : null,
  };
}
