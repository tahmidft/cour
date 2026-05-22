const JIKAN_URL = "https://api.jikan.moe/v4";

export async function getJikanRecommendations(malId) {
  if (!malId) return [];
  try {
    const res = await fetch(`${JIKAN_URL}/anime/${malId}/recommendations`);
    const data = await res.json();
    return (data.data || []).slice(0, 8).map((r) => ({
      id: r.entry.mal_id,
      title: r.entry.title,
      coverImage: r.entry.images?.jpg?.large_image_url,
      source: "jikan",
    }));
  } catch {
    return [];
  }
}
