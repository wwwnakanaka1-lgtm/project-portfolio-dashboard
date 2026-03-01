/** Growth level representing a project's lifecycle stage. */
export type GrowthLevel = "seed" | "growing" | "stable" | "flagship" | "evolved" | "dormant";

/** Metadata for each growth level including display icon and label. */
export interface GrowthLevelInfo {
  level: GrowthLevel;
  icon: string;
  label: string;
  labelJa: string;
  description: string;
  color: string;
  /** Numeric sort order (lower = earlier in lifecycle). */
  order: number;
}

/** Evolution chain entry linking a project to its successor/predecessor. */
export interface EvolutionLink {
  /** ID of the project that superseded this one. */
  supersededBy?: string;
  /** ID of the project that this one superseded. */
  supersedes?: string;
  /** Human-readable note about the evolution. */
  evolutionNote?: string;
}

/** Code statistics for a project (lines, files, languages, dependencies). */
export interface ProjectStats {
  lines: number;
  files: number;
  languages: Record<string, number>;
  dependencies: number;
}

/** Recent activity metrics for a project based on git history. */
export interface ProjectActivity {
  lastUpdated: string;
  commits30d: number;
  activityScore: number;
  dailyActivity?: number[];
}

/** Token usage and estimated cost for a project's AI sessions. */
export interface ProjectCost {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

/** A project in the portfolio with metadata, stats, and optional integrations. */
export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  path: string;
  technologies: string[];
  status: "active" | "archive" | "empty";
  /** Code statistics (lines, files, languages). Added in Phase 3. */
  stats?: ProjectStats;
  /** Git activity metrics (commits, last updated). Added in Phase 3. */
  activity?: ProjectActivity;
  /** AI session token usage and cost. Added in Phase 3. */
  cost?: ProjectCost;
  /** Shell command to launch/start the project. */
  launchCommand?: string;
  /** GitHub repository identifier, e.g. "owner/repo-name". */
  githubRepo?: string;
  /** Growth lifecycle level. Defaults to "seed" for auto-discovered projects. */
  growthLevel?: GrowthLevel;
  /** Evolution chain linkage to predecessor/successor projects. */
  evolution?: EvolutionLink;
}

/** Display metadata for a project category. */
export interface Category {
  name: string;
  color: string;
  icon: string;
}

/** Map of category keys to their display metadata. */
export interface Categories {
  [key: string]: Category;
}

/** Top-level data structure containing all projects, categories, and technology lists. */
export interface ProjectData {
  projects: Project[];
  categories: Categories;
  technologies: {
    languages: string[];
    frameworks: string[];
    visualization: string[];
    ml: string[];
    data: string[];
  };
}

/** Repository statistics fetched from the GitHub API. */
export interface GitHubStats {
  stars: number;
  forks: number;
  openIssues: number;
  openPRs: number;
  lastCommitDate: string | null;
  lastCommitMessage: string | null;
  watchers: number;
  defaultBranch: string;
  language: string | null;
  description: string | null;
}

/** A cached GitHub stats entry with a timestamp for TTL expiration. */
export interface GitHubCacheEntry {
  data: GitHubStats;
  timestamp: number;
}

/** localStorage cache mapping repository identifiers to their cached stats. */
export interface GitHubCache {
  [repo: string]: GitHubCacheEntry;
}

/** Error response from the GitHub API. */
export interface GitHubError {
  message: string;
  status?: number;
}
