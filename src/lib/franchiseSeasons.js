/** Human-readable franchise season label for dashboard detail panel. */
export function formatFranchiseSeasonLabel({ total, index, seasonNumber }) {
  if (!total || total <= 1) return null;
  const current = index ?? seasonNumber ?? null;
  if (current) return `Season ${current} of ${total}`;
  return `${total} seasons in franchise`;
}
