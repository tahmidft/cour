import { anilistGraphql } from "./anilistClient.js";
import { resolveSearchQueries } from "./searchAliases.js";

const JIKAN_URL = "https://api.jikan.moe/v4";
const ANILIST_MIN_SEARCH_LEN = 5;
const MAX_ANILIST_ATTEMPTS = 6;

const MEDIA_SEARCH_FIELDS = `
  id
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  format
  status
  episodes
  season
  seasonYear
  nextAiringEpisode { episode airingAt }
  genres
  meanScore
`;

export class AnimeSearchError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AnimeSearchError";
    this.code = code;
  }
}

function normalizeQuery(query) {
  return query.trim().toLowerCase();
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : Math.min(row[j] + 1, row[j - 1] + 1, prev + 1);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

function mediaTitles(media) {
  const { english, romaji, native } = media.title ?? {};
  return [english, romaji, native].filter(Boolean).map((t) => t.toLowerCase());
}

function pushPhraseVariants(variants, phrase) {
  const lower = phrase.toLowerCase();
  const compact = !lower.includes(" ");

  if (lower.length >= ANILIST_MIN_SEARCH_LEN) {
    variants.push(lower);
    if (compact) {
      const spaced = lower.replace(
        /(full|blue|sword|attack|demon|my|one|dragon|hunter|jujutsu|chainsaw|spy|vinland|mob|re|metal|piece|hero|alchemist)(?=[a-z])/gi,
        "$1 "
      );
      if (spaced !== lower) variants.push(spaced.replace(/\s+/g, " ").trim());
    }
  }

  if (lower.length >= 2 && lower.length <= 8 && compact) {
    for (const vowel of "aeiou") {
      variants.push(lower + vowel);
    }
  }
}

/** Ordered candidates — longest alias targets first, then literal query. */
export function buildSearchVariants(query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const variants = [];
  const resolved = [...resolveSearchQueries(trimmed)].sort((a, b) => b.length - a.length);

  for (const q of resolved) {
    pushPhraseVariants(variants, q);
  }

  return [...new Set(variants)];
}

export function scoreMediaMatch(query, media) {
  const q = normalizeQuery(query);
  if (!q) return 0;

  const qTokens = q.split(/\s+/).filter(Boolean);
  const qCompact = q.replace(/\s+/g, "");

  let best = 0;
  for (const title of mediaTitles(media)) {
    const compactTitle = title.replace(/\s+/g, "");

    if (title.includes(q) || compactTitle.includes(qCompact)) {
      const idx = compactTitle.indexOf(qCompact);
      const atWordStart = idx === 0 || /[\s\-_:·]/.test(title[idx] ?? "");
      best = Math.max(best, (atWordStart ? 140 : 120) - Math.min(idx, 20));
    }

    if (qTokens.length > 1) {
      const allTokens = qTokens.every((tok) => title.includes(tok) || compactTitle.includes(tok));
      if (allTokens) best = Math.max(best, 115);
    }

    for (const word of title.split(/[\s\-_:·]+/)) {
      if (word.startsWith(q) || word.startsWith(qCompact)) best = Math.max(best, 95);
      if (q.length >= 4) {
        const dist = levenshtein(q, word.slice(0, Math.max(word.length, q.length)));
        if (dist <= 2) best = Math.max(best, 88 - dist * 8);
      }
      if (qCompact.length >= 5 && word.length >= 5) {
        const dist = levenshtein(qCompact, word);
        if (dist <= 2) best = Math.max(best, 85 - dist * 8);
      }
    }

    let qi = 0;
    let first = -1;
    let last = -1;
    for (let i = 0; i < title.length && qi < q.length; i++) {
      if (title[i] === q[qi]) {
        if (first === -1) first = i;
        last = i;
        qi++;
      }
    }
    if (qi === q.length) {
      const span = last - first + 1;
      const compact = q.length / Math.max(span, 1);
      best = Math.max(best, 40 + compact * 50);
    }
  }

  const aliasTargets = resolveSearchQueries(query).map((s) => s.toLowerCase());
  for (const title of mediaTitles(media)) {
    for (const target of aliasTargets) {
      if (title.includes(target) || title.replace(/\s+/g, "").includes(target.replace(/\s+/g, ""))) {
        best = Math.max(best, 150);
      }
    }
    if (aliasTargets.some((t) => t.includes("fullmetal") || t.includes("alchemist"))) {
      if (/full\s*metal\s*panic/i.test(title) && !/alchemist/i.test(title)) {
        best = Math.min(best, 45);
      }
      if (/alchemist/i.test(title)) {
        best = Math.max(best, 165);
      }
    }
  }

  return best;
}

export function rankSearchResults(query, batches) {
  const trimmed = query.trim();
  const byId = new Map();
  for (const batch of batches) {
    for (const media of batch) {
      if (media?.id && !byId.has(media.id)) byId.set(media.id, media);
    }
  }

  const minScore = trimmed.length >= 4 ? 30 : 20;
  return [...byId.values()]
    .map((media) => ({ media, score: scoreMediaMatch(trimmed, media) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map(({ media }) => media)
    .slice(0, 20);
}

export async function fetchMediaSearch(search, perPage = 20) {
  try {
    const data = await anilistGraphql({
      query: `
        query ($search: String, $perPage: Int) {
          Page(perPage: $perPage) {
            media(search: $search, type: ANIME) {
              ${MEDIA_SEARCH_FIELDS}
            }
          }
        }
      `,
      variables: { search, perPage },
    });
    return { rateLimited: false, media: data?.data?.Page?.media ?? [] };
  } catch (err) {
    if (err.code === "rate_limited") return { rateLimited: true, media: [] };
    throw err;
  }
}

export async function fetchMediaByMalId(idMal) {
  try {
    const data = await anilistGraphql({
      query: `
        query ($idMal: Int) {
          Media(idMal: $idMal, type: ANIME) {
            ${MEDIA_SEARCH_FIELDS}
          }
        }
      `,
      variables: { idMal },
    });
    return { rateLimited: false, media: data?.data?.Media ?? null };
  } catch (err) {
    if (err.code === "rate_limited") return { rateLimited: true, media: null };
    throw err;
  }
}

async function searchViaJikan(query) {
  const res = await fetch(
    `${JIKAN_URL}/anime?q=${encodeURIComponent(query)}&limit=12`,
    { headers: { Accept: "application/json" } }
  );

  if (res.status === 429) return { rateLimited: true, media: [] };
  if (!res.ok) return { rateLimited: false, media: [] };

  const json = await res.json();
  const malIds = (json.data ?? []).map((a) => a.mal_id).filter(Boolean);
  if (!malIds.length) return { rateLimited: false, media: [] };

  const media = [];
  for (const idMal of malIds.slice(0, 10)) {
    const { rateLimited, media: item } = await fetchMediaByMalId(idMal);
    if (rateLimited) break;
    if (item) media.push(item);
  }

  return { rateLimited: false, media };
}

/** Sequential AniList tries, Jikan fallback, alias-aware ranking. */
export async function searchAnimeImpl(query) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const variants = buildSearchVariants(trimmed);
  const batches = [];
  let rateLimited = false;

  for (let i = 0; i < variants.length && i < MAX_ANILIST_ATTEMPTS; i++) {
    try {
      const { rateLimited: limited, media } = await fetchMediaSearch(variants[i]);
      if (limited) {
        rateLimited = true;
        break;
      }
      if (media.length) batches.push(media);
      const ranked = rankSearchResults(trimmed, batches);
      if (ranked.length >= 5) return ranked;
    } catch (err) {
      if (err.code === "rate_limited") {
        rateLimited = true;
        break;
      }
      throw err;
    }
  }

  let ranked = rankSearchResults(trimmed, batches);

  if (ranked.length < 5) {
    const jikan = await searchViaJikan(trimmed);
    if (jikan.rateLimited && ranked.length === 0) {
      throw new AnimeSearchError(
        "rate_limited",
        "Anime search is temporarily busy. Wait a few seconds and try again."
      );
    }
    if (jikan.media.length) {
      batches.push(jikan.media);
      ranked = rankSearchResults(trimmed, batches);
    }
  }

  if (ranked.length === 0 && rateLimited) {
    throw new AnimeSearchError(
      "rate_limited",
      "AniList rate limit reached. Wait a moment or try a longer search term."
    );
  }

  return ranked;
}
