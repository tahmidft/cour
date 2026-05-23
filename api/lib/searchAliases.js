/** Fan abbreviations and common misspellings → AniList-friendly search terms */
export const SEARCH_ALIASES = {
  fmab: "fullmetal alchemist brotherhood",
  fma: "fullmetal alchemist",
  "full metal": "fullmetal alchemist",
  "full metal alchemist": "fullmetal alchemist",
  "fullmetal": "fullmetal alchemist",
  "fullmetal alchemist brotherhood": "fullmetal alchemist brotherhood",
  aot: "attack on titan",
  "attack on titan": "shingeki no kyojin",
  mha: "my hero academia",
  "my hero acadamy": "my hero academia",
  "my hero academia": "boku no hero academia",
  jjk: "jujutsu kaisen",
  "demon slayer": "kimetsu no yaiba",
  kny: "kimetsu no yaiba",
  op: "one piece",
  "one peice": "one piece",
  "one piece": "one piece",
  hxh: "hunter x hunter",
  "hunter x hunter": "hunter x hunter",
  csm: "chainsaw man",
  "spy family": "spy x family",
  "spy x family": "spy x family",
  "vinland saga": "vinland saga",
  "mob psycho": "mob psycho 100",
  "death note": "death note",
  "cowboy bebop": "cowboy bebop",
  "code geass": "code geass",
  "steins gate": "steins gate",
  "steins;gate": "steins gate",
  "your name": "kimi no na wa",
  "silent voice": "koe no katachi",
};

export function resolveSearchQueries(raw) {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const queries = new Set([trimmed]);

  if (SEARCH_ALIASES[lower]) {
    queries.add(SEARCH_ALIASES[lower]);
  }

  if (lower.includes(" ")) {
    queries.add(lower.replace(/\s+/g, ""));
  }

  const compact = lower.replace(/\s+/g, "");
  if (compact !== lower) queries.add(compact);

  for (const [alias, target] of Object.entries(SEARCH_ALIASES)) {
    if (lower === alias || lower.includes(alias)) {
      queries.add(target);
    }
  }

  return [...queries];
}
