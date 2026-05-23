import { fetchMediaSearch } from "./animeSearch.js";

const STATUS_ELIGIBLE = new Set(["RELEASING", "NOT_YET_RELEASED"]);
const TV_FORMATS = new Set(["TV", "TV_SHORT"]);
const STOPWORDS = new Set([
  "season",
  "part",
  "cour",
  "the",
  "a",
  "an",
  "of",
  "and",
  "final",
  "chapter",
  "finale",
  "2nd",
  "3rd",
  "4th",
  "5th",
]);

/** Hard cap on extra AniList search calls per cron run. */
export const FALLBACK_SEARCH_BUDGET = 20;

const FINAL_SIGNAL =
  /\b(final\s+season|the\s+final\s+season|final\s+chapter|the\s+final\s+chapter|final\s+cour|grand\s+finale|finale)\b/i;

function cleanTitle(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b(season|part|cour)\s*\d+\b/g, " ")
    .replace(/\b\d+(st|nd|rd|th)\s+season\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleTokenSet(value) {
  return new Set(
    cleanTitle(value)
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t && !STOPWORDS.has(t))
  );
}

function sharedTokenCount(a, b) {
  if (!a.size || !b.size) return 0;
  let count = 0;
  for (const token of a) {
    if (b.has(token)) count++;
  }
  return count;
}

export function inferSeasonFromTitle(title) {
  if (!title) return null;
  const lower = title.toLowerCase();
  const patterns = [
    /season\s+(\d{1,2})/,
    /(\d{1,2})(?:st|nd|rd|th)\s+season/,
    /\bpart\s+(\d{1,2})\b/,
    /\bcour\s+(\d{1,2})\b/,
    /\bs(\d{1,2})\b/,
  ];

  for (const p of patterns) {
    const match = lower.match(p);
    if (match?.[1]) {
      const n = parseInt(match[1], 10);
      if (!Number.isNaN(n) && n > 0) return n;
    }
  }
  return null;
}

function hasFinalSeasonSignal(title) {
  return FINAL_SIGNAL.test(title || "");
}

function candidateTitles(candidate) {
  return [candidate.title?.english, candidate.title?.romaji, candidate.title?.native].filter(Boolean);
}

function passesBaseChecks(show, candidate, trackedAnilistIds) {
  if (!candidate?.id || candidate.id === show.anilist_id) return false;
  if (trackedAnilistIds.has(candidate.id)) return false;
  if (!STATUS_ELIGIBLE.has(candidate.status)) return false;
  if (candidate.format && !TV_FORMATS.has(candidate.format)) return false;
  return true;
}

function isNumberedFallbackCandidate(show, candidate, expectedSeason, trackedAnilistIds) {
  if (!passesBaseChecks(show, candidate, trackedAnilistIds)) return false;

  const baseTokens = titleTokenSet(show.title_en || show.title_jp || "");
  const titles = candidateTitles(candidate);
  const tokenSets = titles.map(titleTokenSet);
  const overlap = Math.max(...tokenSets.map((set) => sharedTokenCount(baseTokens, set)), 0);
  if (overlap < 2) return false;

  const inferred = titles.map(inferSeasonFromTitle).find((n) => typeof n === "number");
  if (typeof inferred === "number") {
    if (inferred < expectedSeason) return false;
    if (inferred > expectedSeason + 1) return false;
    return true;
  }
  return false;
}

function isFinalFallbackCandidate(show, candidate, expectedSeason, trackedAnilistIds) {
  if (!passesBaseChecks(show, candidate, trackedAnilistIds)) return false;

  const baseTokens = titleTokenSet(show.title_en || show.title_jp || "");
  const titles = candidateTitles(candidate);
  const tokenSets = titles.map(titleTokenSet);

  const numbered = titles.map(inferSeasonFromTitle).find((n) => typeof n === "number");
  if (typeof numbered === "number" && (numbered < expectedSeason || numbered > expectedSeason + 1)) {
    return false;
  }

  for (let i = 0; i < titles.length; i++) {
    const title = titles[i];
    const set = tokenSets[i];
    if (!hasFinalSeasonSignal(title)) continue;

    const overlap = sharedTokenCount(baseTokens, set);
    if (baseTokens.size <= 2) {
      if ([...baseTokens].every((t) => set.has(t))) return true;
      continue;
    }
    if (overlap >= 3 && overlap / baseTokens.size >= 0.6) return true;
  }
  return false;
}

export function createFallbackBudget(limit = FALLBACK_SEARCH_BUDGET) {
  return { remaining: limit, used: 0, rateLimited: false };
}

async function runBudgetedSearch(query, budget) {
  if (budget.rateLimited || budget.remaining <= 0) return [];
  budget.remaining -= 1;
  budget.used += 1;

  try {
    const { rateLimited, media } = await fetchMediaSearch(query, 12);
    if (rateLimited) {
      budget.rateLimited = true;
      return [];
    }
    return media;
  } catch {
    return [];
  }
}

function pickCandidates(show, results, expectedSeason, trackedAnilistIds, matcher) {
  const byId = new Map();
  for (const media of results) {
    if (matcher(show, media, expectedSeason, trackedAnilistIds)) byId.set(media.id, media);
  }
  return [...byId.values()];
}

/**
 * Tier 1: numbered season search (up to 2 queries).
 * Tier 2: final season/chapter search (1 query, only if tier 1 empty).
 */
export async function findFallbackSequelCandidates(show, expectedSeason, trackedAnilistIds, budget) {
  const baseTitle = show.title_en || show.title_jp;
  if (!baseTitle) return [];

  const numberedQueries = [
    `${baseTitle} season ${expectedSeason}`,
    `${baseTitle} ${expectedSeason}th season`,
  ];

  const numberedMatches = [];
  for (const q of numberedQueries) {
    if (budget.rateLimited) break;
    const results = await runBudgetedSearch(q, budget);
    numberedMatches.push(
      ...pickCandidates(show, results, expectedSeason, trackedAnilistIds, isNumberedFallbackCandidate)
    );
    if (numberedMatches.length > 0) break;
  }

  if (numberedMatches.length > 0) {
    return numberedMatches.slice(0, 1).map((media) => {
      const title = media.title?.english || media.title?.romaji || media.title?.native || "";
      const inferred = inferSeasonFromTitle(title);
      return {
        media,
        seasonNumber: inferred && inferred >= expectedSeason ? inferred : expectedSeason,
      };
    });
  }

  if (budget.rateLimited || budget.remaining <= 0) return [];

  const finalResults = await runBudgetedSearch(`${baseTitle} final season`, budget);
  const finalMatches = pickCandidates(
    show,
    finalResults,
    expectedSeason,
    trackedAnilistIds,
    isFinalFallbackCandidate
  );

  return finalMatches.slice(0, 1).map((media) => ({
    media,
    seasonNumber: expectedSeason,
  }));
}
