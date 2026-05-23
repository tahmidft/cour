const CACHE_KEY = "cour-anime-details-v1";
const MAX_ENTRIES = 48;

export function readDetailsCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function writeDetailsCache(cache) {
  try {
    const keys = Object.keys(cache);
    let payload = cache;
    if (keys.length > MAX_ENTRIES) {
      payload = Object.fromEntries(
        keys.slice(-MAX_ENTRIES).map((k) => [k, cache[k]])
      );
    }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export async function fetchAnimeDetail(anilistId) {
  const res = await fetch(`/api/anime?id=${anilistId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { media: null, error: data.error || "Failed to load" };
  return { media: data.media ?? null, error: null };
}

const PREFETCH_GAP_MS = 420;

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Queue prefetch requests so we do not hammer /api/anime. */
export function createDetailPrefetcher(getCache, setCache) {
  const inFlight = new Set();
  let chain = Promise.resolve();

  function enqueue(anilistId) {
    if (!anilistId || getCache()[anilistId] || inFlight.has(anilistId)) return;

    chain = chain.then(async () => {
      if (getCache()[anilistId] || inFlight.has(anilistId)) return;
      inFlight.add(anilistId);
      await delay(PREFETCH_GAP_MS);
      const { media } = await fetchAnimeDetail(anilistId);
      inFlight.delete(anilistId);
      if (media) {
        setCache((prev) => {
          if (prev[anilistId]) return prev;
          const next = { ...prev, [anilistId]: media };
          writeDetailsCache(next);
          return next;
        });
      }
    });
  }

  return {
    enqueue,
    enqueueAll(ids) {
      for (const id of ids) enqueue(id);
    },
  };
}
