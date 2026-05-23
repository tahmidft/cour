import { format } from "date-fns";

export const FILTERS = ["All shows", "Airing", "Upcoming", "Finished"];

const STATUS_UI = {
  RELEASING: "AIRING",
  FINISHED: "FINISHED",
  NOT_YET_RELEASED: "UPCOMING",
  CANCELLED: "FINISHED",
  HIATUS: "UPCOMING",
};

const FILTER_STATUS = {
  Airing: ["RELEASING"],
  Upcoming: ["NOT_YET_RELEASED", "HIATUS"],
  Finished: ["FINISHED", "CANCELLED"],
};

const SEASON_MAP = {
  Spring: "SPRING",
  Summer: "SUMMER",
  Fall: "FALL",
  Winter: "WINTER",
};

export function parseSeasonLabel(label) {
  const [name, year] = label.split(" ");
  return { season: SEASON_MAP[name], year: parseInt(year, 10) };
}

export function mapTrackedShow(show) {
  const nextEp = show.last_known_episode ?? 0;
  let genres = [];
  try { genres = show.genres ? JSON.parse(show.genres) : []; } catch { genres = []; }
  const total = show.total_episodes ?? null;
  const watched = show.episodes_watched ?? 0;

  return {
    id: show.id,
    anilistId: show.anilist_id,
    titleJp: show.title_jp,
    titleEn: show.title_en,
    season: show.season_year ? `S${show.season_number || 1}` : "",
    seasonYear: show.season_year,
    status: STATUS_UI[show.status] || show.status || "UNKNOWN",
    rawStatus: show.status,
    airDay: show.air_day,
    episode: nextEp,
    episodesWatched: watched,
    totalEpisodes: total,
    watchProgress: total ? Math.min(100, Math.round((watched / total) * 100)) : null,
    nextAiringAt: show.next_airing_at,
    coverImage: show.cover_image,
    weeklyReminder: show.weekly_reminder,
    genres,
  };
}

/** Build sorted unique year list from tracked shows for the season sidebar. */
export function buildSeasonList(shows) {
  const years = [...new Set(shows.map((s) => s.seasonYear).filter(Boolean))].sort(
    (a, b) => b - a
  );
  return ["All seasons", ...years.map((y) => String(y))];
}

/** Build sorted unique genre list from tracked shows. */
export function buildGenreList(shows) {
  const all = new Set();
  for (const s of shows) {
    for (const g of s.genres || []) all.add(g);
  }
  return [...all].sort();
}

export function filterShows(shows, activeFilter, activeSeason, activeGenre) {
  let result = shows;
  if (activeFilter !== "All shows") {
    const allowed = FILTER_STATUS[activeFilter] || [];
    result = result.filter((s) => allowed.includes(s.rawStatus));
  }
  if (activeSeason && activeSeason !== "All seasons") {
    const year = parseInt(activeSeason, 10);
    result = result.filter((s) => !s.seasonYear || s.seasonYear === year);
  }
  if (activeGenre && activeGenre !== "All genres") {
    result = result.filter((s) => s.genres?.includes(activeGenre));
  }
  return result;
}

export function buildWeekSchedule(shows) {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const schedule = days.map((day) => ({ day, shows: [] }));

  for (const show of shows) {
    if (!show.airDay) continue;
    const dayMatch = show.airDay.match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/i);
    if (!dayMatch) continue;
    const day = dayMatch[1].toUpperCase();
    const idx = days.indexOf(day);
    if (idx === -1) continue;
    schedule[idx].shows.push({
      title: show.titleEn,
      ep: (show.episode || 0) + 1,
    });
  }

  return schedule;
}

export function buildTickerItems(shows) {
  return shows
    .filter((s) => s.rawStatus === "RELEASING" && s.nextAiringAt)
    .slice(0, 8)
    .map((s) => {
      const day = s.airDay?.replace("Every ", "") || "TBA";
      return `${s.titleEn} — Ep ${(s.episode || 0) + 1} ${day}`;
    });
}

export function formatAirTime(ms) {
  if (!ms) return null;
  try {
    return format(new Date(ms), "EEE h:mm a");
  } catch {
    return null;
  }
}

export function dayFromAiringAt(ms) {
  if (!ms) return null;
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date(ms).getDay()];
}

export function inferAirDay(anilistMedia) {
  const next = anilistMedia.nextAiringEpisode;
  if (!next?.airingAt) return null;
  const day = dayFromAiringAt(next.airingAt * 1000);
  return day ? `Every ${day}` : null;
}
