import { anilistGraphql } from "./anilistClient.js";

const TV_FORMATS = new Set(["TV", "TV_SHORT"]);
const RELATION_CACHE = new Map();
const FRANCHISE_CACHE = new Map();

const RELATIONS_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      relations {
        edges {
          relationType
          node {
            id
            type
            format
          }
        }
      }
    }
  }
`;

function isTvSeason(node) {
  return node?.type === "ANIME" && TV_FORMATS.has(node.format);
}

async function fetchRelations(id) {
  if (RELATION_CACHE.has(id)) return RELATION_CACHE.get(id);
  const data = await anilistGraphql({
    query: RELATIONS_QUERY,
    variables: { id },
  });
  const edges = data?.data?.Media?.relations?.edges ?? [];
  RELATION_CACHE.set(id, edges);
  return edges;
}

function prequelIds(edges) {
  return edges
    .filter((e) => e.relationType === "PREQUEL" && isTvSeason(e.node))
    .map((e) => e.node.id);
}

function sequelId(edges) {
  const sequels = edges
    .filter((e) => e.relationType === "SEQUEL" && isTvSeason(e.node))
    .map((e) => e.node.id);
  return sequels[0] ?? null;
}

async function findFranchiseRoot(id, visited = new Set()) {
  if (visited.has(id)) return id;
  visited.add(id);
  const edges = await fetchRelations(id);
  const prequels = prequelIds(edges);
  if (!prequels.length) return id;
  return findFranchiseRoot(prequels[0], visited);
}

async function buildSeasonChain(rootId) {
  const chain = [];
  const visited = new Set();
  let current = rootId;

  while (current && !visited.has(current)) {
    visited.add(current);
    chain.push(current);
    const edges = await fetchRelations(current);
    current = sequelId(edges);
  }

  return chain;
}

export async function getFranchiseSeasonInfo(anilistId) {
  if (FRANCHISE_CACHE.has(anilistId)) return FRANCHISE_CACHE.get(anilistId);

  try {
    const rootId = await findFranchiseRoot(anilistId);
    const chain = await buildSeasonChain(rootId);
    const total = chain.length;

    for (let i = 0; i < chain.length; i++) {
      FRANCHISE_CACHE.set(chain[i], {
        total,
        index: i + 1,
      });
    }

    return FRANCHISE_CACHE.get(anilistId) ?? { total: 1, index: 1 };
  } catch {
    return { total: null, index: null };
  }
}
