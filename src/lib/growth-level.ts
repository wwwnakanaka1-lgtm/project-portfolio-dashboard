import { GrowthLevel, GrowthLevelInfo, Project } from "./types";

/** Canonical growth level metadata, ordered by lifecycle stage. */
export const GROWTH_LEVELS: GrowthLevelInfo[] = [
  {
    level: "seed",
    icon: "\u{1F331}",
    label: "Seed",
    labelJa: "\u5B9F\u9A13",
    description: "PoC\u30FB\u8A66\u4F5C\u54C1",
    color: "#84CC16",
    order: 0,
  },
  {
    level: "growing",
    icon: "\u{1F33F}",
    label: "Growing",
    labelJa: "\u6210\u9577\u4E2D",
    description: "\u958B\u767A\u4E2D\u30FB\u672A\u5B8C\u6210",
    color: "#22C55E",
    order: 1,
  },
  {
    level: "stable",
    icon: "\u{1F333}",
    label: "Stable",
    labelJa: "\u5B89\u5B9A",
    description: "\u5B8C\u6210\u30FB\u4F7F\u7528\u4E2D",
    color: "#14B8A6",
    order: 2,
  },
  {
    level: "flagship",
    icon: "\u2B50",
    label: "Flagship",
    labelJa: "\u4E3B\u529B",
    description: "\u30AB\u30C6\u30B4\u30EA\u5185\u30D9\u30B9\u30C8\u7248",
    color: "#F59E0B",
    order: 3,
  },
  {
    level: "evolved",
    icon: "\u{1F504}",
    label: "Evolved",
    labelJa: "\u4E16\u4EE3\u4EA4\u4EE3",
    description: "\u5F8C\u7D99\u7248\u306B\u7F6E\u63DB\u6E08\u307F",
    color: "#6366F1",
    order: 4,
  },
  {
    level: "dormant",
    icon: "\u{1F4A4}",
    label: "Dormant",
    labelJa: "\u4F11\u7720",
    description: "\u672A\u4F7F\u7528\u30FB\u6574\u7406\u5019\u88DC",
    color: "#9CA3AF",
    order: 5,
  },
];

/** Map for O(1) lookup by level key. */
export const GROWTH_LEVEL_MAP: Record<GrowthLevel, GrowthLevelInfo> =
  Object.fromEntries(GROWTH_LEVELS.map((gl) => [gl.level, gl])) as Record<
    GrowthLevel,
    GrowthLevelInfo
  >;

/** Default growth level for auto-discovered projects. */
export const DEFAULT_GROWTH_LEVEL: GrowthLevel = "seed";

/** Get GrowthLevelInfo for a project, defaulting to "seed". */
export function getGrowthLevelInfo(project: Project): GrowthLevelInfo {
  return GROWTH_LEVEL_MAP[project.growthLevel ?? DEFAULT_GROWTH_LEVEL];
}

/** Get sort order for a growth level (for table sorting). */
export function getGrowthLevelOrder(project: Project): number {
  return getGrowthLevelInfo(project).order;
}

/**
 * Build the full evolution chain for a given project.
 *
 * Traverses both predecessors (via supersedes) and successors (via supersededBy)
 * and returns an ordered array of projects from oldest to newest.
 * Guards against circular references.
 */
export function buildEvolutionChain(
  projectId: string,
  allProjects: Project[]
): Project[] {
  const projectMap = new Map(allProjects.map((p) => [p.id, p]));

  // Walk backward to find the chain root
  let rootId = projectId;
  const visited = new Set<string>();
  while (true) {
    visited.add(rootId);
    const project = projectMap.get(rootId);
    const predecessorId = project?.evolution?.supersedes;
    if (!predecessorId || visited.has(predecessorId)) break;
    rootId = predecessorId;
  }

  // Walk forward from root to build the ordered chain
  const chain: Project[] = [];
  let currentId: string | undefined = rootId;
  const forwardVisited = new Set<string>();
  while (currentId) {
    if (forwardVisited.has(currentId)) break;
    forwardVisited.add(currentId);
    const project = projectMap.get(currentId);
    if (project) {
      chain.push(project);
      currentId = project.evolution?.supersededBy;
    } else {
      break;
    }
  }

  return chain;
}

/** Count projects by growth level for chart data. */
export function countByGrowthLevel(
  projects: Project[]
): Array<{ level: GrowthLevel; info: GrowthLevelInfo; count: number }> {
  const counts: Record<GrowthLevel, number> = {
    seed: 0,
    growing: 0,
    stable: 0,
    flagship: 0,
    evolved: 0,
    dormant: 0,
  };

  for (const p of projects) {
    const level = p.growthLevel ?? DEFAULT_GROWTH_LEVEL;
    counts[level]++;
  }

  return GROWTH_LEVELS.map((info) => ({
    level: info.level,
    info,
    count: counts[info.level],
  }));
}
