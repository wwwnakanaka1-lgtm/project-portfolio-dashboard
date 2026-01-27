export interface ProjectStats {
  lines: number;
  files: number;
  languages: Record<string, number>;
  dependencies: number;
}

export interface ProjectActivity {
  lastUpdated: string;
  commits30d: number;
  activityScore: number;
  dailyActivity?: number[];
}

export interface ProjectCost {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  description: string;
  path: string;
  technologies: string[];
  status: "active" | "archive" | "empty";
  // Phase 3 追加フィールド
  stats?: ProjectStats;
  activity?: ProjectActivity;
  cost?: ProjectCost;
  launchCommand?: string;
}

export interface Category {
  name: string;
  color: string;
  icon: string;
}

export interface Categories {
  [key: string]: Category;
}

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
