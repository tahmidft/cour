import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Layout from "../components/Layout";
import DiscoverDetailPanel from "../components/DiscoverDetailPanel";
import { useTrackedShowsContext } from "../context/TrackedShowsContext";
import { useThemeContext } from "../context/ThemeContext";
import { fetchAnimeDetail } from "../lib/animeDetailsCache";
import { formatMatchLabel, formatScoreLabel, sortDiscoverItems, DISCOVER_SORT_OPTIONS } from "../lib/discoverLabels";
import toast from "react-hot-toast";

const INITIAL_MIN_RATING = 85;
const RATING_STEP = 15;
const FLOOR_RATING = 40;

function computeColumnCount(width) {
  const gap = width <= 768 ? 10 : 14;
  if (width <= 480) return 2;
  const minCard = width <= 768 ? 130 : 160;
  return Math.max(1, Math.floor((width + gap) / (minCard + gap)));
}

function deriveHasMore({ apiHasMore, mergedLength, visibleCount, rating }) {
  if (apiHasMore) return true;
  if (visibleCount < mergedLength) return true;
  if (rating > FLOOR_RATING) return true;
  return false;
}

function normalizeDisplayCount(requested, total, cols, hasMore) {
  if (total === 0 || cols < 1) return 0;
  if (!hasMore) return total;

  const capped = Math.min(Math.max(requested, 0), total);
  const fullRows = Math.floor(capped / cols) * cols;
  if (fullRows >= cols) return fullRows;
  return capped;
}

function useGridColumns(gridRef) {
  const [columnCount, setColumnCount] = useState(4);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const measure = () => {
      setColumnCount(computeColumnCount(el.clientWidth));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return columnCount;
}

function DiscoverCard({
  media,
  expanded,
  detail,
  detailLoading,
  tracked,
  tracking,
  accent,
  isDark,
  border,
  textPrimary,
  textMuted,
  soft,
  onToggle,
  onTrack,
}) {
  const titleEn = media.title?.english || media.title?.romaji;

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <article
      className={`discover-card${expanded ? " discover-card--expanded" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      style={{
        border: `1px solid ${border}`,
        background: isDark ? "#13131a" : "#fff",
        outline: expanded ? `1px solid ${accent}55` : "none",
        cursor: "pointer",
      }}
    >
      <div className="discover-card-expand-row">
        <div className="discover-card-compact">
          {media.coverImage?.large ? (
            <img src={media.coverImage.large} alt="" className="discover-card-cover" />
          ) : (
            <div
              className="discover-card-cover"
              style={{ background: isDark ? "#1a1a24" : "#eee" }}
            />
          )}
          <div className="discover-card-body">
            <div className="discover-card-meta">
              <div style={{ fontSize: 8, color: textMuted, lineHeight: 1.3, minHeight: 10 }}>
                {media.title?.native || "\u00a0"}
              </div>
              <div className="discover-card-title" style={{ color: textPrimary }}>
                {titleEn}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: accent,
                  marginBottom: 6,
                  fontFamily: "monospace",
                  minHeight: 10,
                }}
              >
                {formatMatchLabel(media.similarity) ?? "\u00a0"}
              </div>
              <div className="discover-card-genres">
                {(media.genres || []).slice(0, 2).map((g) => (
                  <span
                    key={g}
                    style={{
                      fontSize: 7,
                      padding: "2px 5px",
                      background: soft,
                      color: accent,
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: accent,
                  fontFamily: "monospace",
                  minHeight: 11,
                }}
              >
                {formatScoreLabel(media.meanScore) ?? "\u00a0"}
              </div>
              <div style={{ fontSize: 8, color: textMuted, marginTop: 4 }}>
                {expanded ? "▲ hide" : "▼ details"}
              </div>
            </div>
            <button
              type="button"
              className="discover-card-track"
              disabled={tracked || tracking === media.id}
              onClick={(e) => {
                e.stopPropagation();
                onTrack(media);
              }}
              style={{
                background: tracked ? "transparent" : `${accent}22`,
                color: tracked ? textMuted : accent,
                border: `1px solid ${tracked ? border : accent}`,
                cursor: tracked ? "default" : "pointer",
              }}
            >
              {tracked ? "Tracking \u2713" : tracking === media.id ? "..." : "Track"}
            </button>
          </div>
        </div>

        {expanded && (
          <DiscoverDetailPanel
            media={media}
            detail={detail}
            loading={detailLoading}
            accent={accent}
            isDark={isDark}
          />
        )}
      </div>
    </article>
  );
}

export default function Discover() {
  const { shows, addShow } = useTrackedShowsContext();
  const { styles, isDark } = useThemeContext();
  const { accent, soft, bgPanel, border, textPrimary, textMuted } = styles;

  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [minRating, setMinRating] = useState(INITIAL_MIN_RATING);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [sortBy, setSortBy] = useState("match");
  const [displayCount, setDisplayCount] = useState(0);
  const gridRef = useRef(null);
  const displayCountRef = useRef(0);
  const columnCount = useGridColumns(gridRef);

  useEffect(() => {
    displayCountRef.current = displayCount;
  }, [displayCount]);

  const trackedIds = shows.map((s) => s.anilist_id);
  const trackedSet = new Set(trackedIds);
  const sourceKey = trackedIds.join(",");

  const fetchDiscover = useCallback(
    async (rating, currentRecs) => {
      const exclude = [...trackedSet, ...currentRecs.map((r) => r.id)].join(",");
      const params = new URLSearchParams({
        minRating: String(rating),
        exclude,
        tracked: trackedIds.join(","),
      });
      if (trackedIds.length) params.set("ids", trackedIds.join(","));

      const res = await fetch(`/api/discover?${params}`);
      const data = await res.json().catch(() => ({}));

      if (res.status === 429 || data.rateLimited) {
        throw new Error(data.error || "Rate limited — try again in a few seconds.");
      }
      if (!res.ok) {
        throw new Error(data.error || "Failed to load recommendations");
      }

      return data;
    },
    [sourceKey]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setDisplayCount(0);
      let rating = INITIAL_MIN_RATING;
      try {
        let results = [];
        let lastData = null;
        while (rating >= FLOOR_RATING && results.length === 0) {
          const data = await fetchDiscover(rating, []);
          lastData = data;
          if (cancelled) return;
          results = data.results ?? [];
          if (results.length > 0) {
            setMinRating(rating);
            break;
          }
          rating -= RATING_STEP;
        }
        if (cancelled) return;
        setRecs(results);
        setMinRating(rating);
        setHasMore(lastData?.hasMore ?? false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setRecs([]);
          setHasMore(false);
        }
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sourceKey, fetchDiscover]);

  useEffect(() => {
    if (!expandedId || detailCache[expandedId]) return;

    let cancelled = false;
    const id = expandedId;
    setDetailLoadingId(id);

    fetchAnimeDetail(id).then(({ media, error: fetchErr }) => {
      if (cancelled) return;
      setDetailLoadingId((loadingId) => (loadingId === id ? null : loadingId));
      if (media) {
        setDetailCache((prev) => ({ ...prev, [id]: media }));
      } else if (fetchErr) {
        toast.error(fetchErr);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [expandedId, detailCache]);

  const sortedRecs = useMemo(() => sortDiscoverItems(recs, sortBy), [recs, sortBy]);

  useEffect(() => {
    if (loading || columnCount < 1 || sortedRecs.length === 0) return;
    const canLoad = deriveHasMore({
      apiHasMore: hasMore,
      mergedLength: sortedRecs.length,
      visibleCount: displayCount,
      rating: minRating,
    });
    setDisplayCount((prev) => {
      if (prev === 0) {
        return normalizeDisplayCount(sortedRecs.length, sortedRecs.length, columnCount, canLoad);
      }
      return prev;
    });
  }, [loading, columnCount, sortedRecs.length, hasMore, minRating, sourceKey]);

  useEffect(() => {
    if (columnCount < 1 || displayCount === 0) return;
    const canLoad = deriveHasMore({
      apiHasMore: hasMore,
      mergedLength: sortedRecs.length,
      visibleCount: displayCount,
      rating: minRating,
    });
    setDisplayCount((prev) =>
      normalizeDisplayCount(prev, sortedRecs.length, columnCount, canLoad)
    );
  }, [columnCount, hasMore, minRating, sortedRecs.length]);

  async function appendDiscoverBatch(currentRecs, currentMinRating) {
    const nextRating = Math.max(FLOOR_RATING, currentMinRating - RATING_STEP);
    const data = await fetchDiscover(nextRating, currentRecs);
    const incoming = data.results ?? [];

    const seen = new Set(currentRecs.map((r) => r.id));
    const merged = [...currentRecs];
    for (const item of incoming) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }

    const nextMin = data.nextMinRating ?? nextRating;
    const apiHasMore =
      data.hasMore ??
      (nextMin > FLOOR_RATING || (nextMin === FLOOR_RATING && incoming.length > 0));

    return {
      merged,
      nextRating: nextMin,
      apiHasMore,
    };
  }

  async function handleLoadMore() {
    if (loadingMore) return;

    const step = columnCount;
    const targetCount = displayCountRef.current + step;
    setLoadingMore(true);
    setError(null);

    try {
      let merged = recs;
      let rating = minRating;
      let apiHasMore = hasMore;

      if (merged.length < targetCount) {
        while (merged.length < targetCount && (apiHasMore || rating > FLOOR_RATING)) {
          const prevLength = merged.length;
          const batch = await appendDiscoverBatch(merged, rating);
          merged = batch.merged;
          rating = batch.nextRating;
          apiHasMore = batch.apiHasMore;
          if (merged.length === prevLength && !apiHasMore && rating <= FLOOR_RATING) break;
        }
      }

      const canLoad = deriveHasMore({
        apiHasMore,
        mergedLength: merged.length,
        visibleCount: targetCount,
        rating,
      });
      let nextDisplay = normalizeDisplayCount(
        Math.min(targetCount, merged.length),
        merged.length,
        columnCount,
        canLoad
      );
      if (nextDisplay <= displayCountRef.current && merged.length > displayCountRef.current) {
        if (!canLoad) {
          nextDisplay = merged.length;
        } else if (merged.length >= displayCountRef.current + step) {
          nextDisplay = normalizeDisplayCount(
            displayCountRef.current + step,
            merged.length,
            columnCount,
            canLoad
          );
        }
      }

      setRecs(merged);
      setMinRating(rating);
      setHasMore(apiHasMore);
      setDisplayCount(nextDisplay);
    } catch (err) {
      toast.error(err.message);
    }

    setLoadingMore(false);
  }

  async function handleTrack(media) {
    setTracking(media.id);
    const err = await addShow(media);
    setTracking(null);
    if (err) toast.error(err.message);
    else toast.success("Added to your list");
  }

  function handleToggleExpand(mediaId) {
    setExpandedId((prev) => (prev === mediaId ? null : mediaId));
  }

  const visibleRecs = sortedRecs.slice(0, displayCount);
  const nextThreshold = Math.max(FLOOR_RATING, minRating - RATING_STEP);
  const canLoadMore = deriveHasMore({
    apiHasMore: hasMore,
    mergedLength: sortedRecs.length,
    visibleCount: displayCount,
    rating: minRating,
  });
  const showLoadMore = !loading && canLoadMore && displayCount > 0;

  return (
    <Layout activeTab="DISCOVER">
      <div style={{ padding: 16, background: bgPanel, minHeight: "calc(100vh - 130px)" }}>
        <div
          className="discover-header"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: textPrimary,
            }}
          >
            DISCOVER
            <span style={{ fontSize: 9, color: textMuted, marginLeft: 8 }}>
              {shows.length === 0 ? "top airing" : "personalized picks"}
            </span>
          </div>

          {!loading && recs.length > 0 && (
            <label className="discover-sort" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, letterSpacing: "0.12em", color: textMuted }}>SORT</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  fontSize: 10,
                  letterSpacing: "0.06em",
                  padding: "6px 10px",
                  background: isDark ? "#13131a" : "#fff",
                  color: textPrimary,
                  border: `1px solid ${border}`,
                  cursor: "pointer",
                }}
              >
                {DISCOVER_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {loading && (
          <div style={{ color: textMuted, fontSize: 12 }}>Loading recommendations...</div>
        )}

        {error && !loading && (
          <div style={{ color: "#c8222a", fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}

        {!loading && !error && recs.length === 0 && (
          <div style={{ color: textMuted, fontSize: 12 }}>
            {shows.length === 0
              ? "Add shows to your list for personalized picks."
              : "No recommendations right now. Try again shortly."}
          </div>
        )}

        <div
          ref={gridRef}
          className="discover-grid"
          style={{ ["--discover-cols"]: columnCount }}
        >
          {visibleRecs.map((media) => {
            const tracked = trackedSet.has(media.id);
            const expanded = expandedId === media.id;
            const detail = detailCache[media.id] ?? null;
            const detailLoading = expanded && !detail && detailLoadingId === media.id;

            return (
              <DiscoverCard
                key={media.id}
                media={media}
                expanded={expanded}
                detail={detail}
                detailLoading={detailLoading}
                tracked={tracked}
                tracking={tracking}
                accent={accent}
                isDark={isDark}
                border={border}
                textPrimary={textPrimary}
                textMuted={textMuted}
                soft={soft}
                onToggle={() => handleToggleExpand(media.id)}
                onTrack={handleTrack}
              />
            );
          })}
        </div>

        {showLoadMore && (
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              type="button"
              disabled={loadingMore}
              onClick={handleLoadMore}
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                padding: "12px 28px",
                background: "transparent",
                color: accent,
                border: `1px solid ${accent}`,
                cursor: loadingMore ? "wait" : "pointer",
              }}
            >
              {loadingMore
                ? "Loading..."
                : minRating > FLOOR_RATING
                  ? `Load more\u2026 (${nextThreshold}%+ match)`
                  : "Load more\u2026 (40%+ match)"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
