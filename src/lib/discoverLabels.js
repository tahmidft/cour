/** Display match %; values over 100 from AniList are capped at 100 for display. */
export function formatMatchLabel(similarity) {
  if (similarity == null) return null;
  return `${Math.min(100, Math.round(similarity))}% match`;
}

export function formatScoreLabel(meanScore) {
  if (meanScore == null || meanScore <= 0) return null;
  return `${Math.round(meanScore)}% score`;
}

export const DISCOVER_SORT_OPTIONS = [
  { value: "match", label: "Match %" },
  { value: "rating", label: "AniList rating" },
  { value: "recent", label: "Most recent" },
];

export function sortDiscoverItems(items, sortBy) {
  return [...items].sort((a, b) => {
    if (sortBy === "rating") {
      const diff = (b.meanScore ?? 0) - (a.meanScore ?? 0);
      if (diff !== 0) return diff;
      return (b.similarity ?? 0) - (a.similarity ?? 0);
    }
    if (sortBy === "recent") {
      const diff = (b.seasonYear ?? 0) - (a.seasonYear ?? 0);
      if (diff !== 0) return diff;
      return (b.similarity ?? 0) - (a.similarity ?? 0);
    }
    const byMatch = (b.similarity ?? 0) - (a.similarity ?? 0);
    if (byMatch !== 0) return byMatch;
    return (b.meanScore ?? 0) - (a.meanScore ?? 0);
  });
}
