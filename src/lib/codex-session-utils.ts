import fs from "fs";
import path from "path";

export type PlanStepStatus = "pending" | "in_progress" | "completed" | "unknown";

export interface PlanStep {
  step: string;
  status: PlanStepStatus;
}

export interface PlanProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percent: number;
  lastUpdated: string;
  steps: PlanStep[];
}

interface WalkJsonlFilesOptions {
  maxFiles?: number;
}

interface WalkJsonlFilesResult {
  files: string[];
  reachedLimit: boolean;
}

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function compactText(value: string, maxLength = 120): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

function normalizePlanStatus(status: unknown): PlanStepStatus {
  if (status === "pending" || status === "in_progress" || status === "completed") {
    return status;
  }
  return "unknown";
}

export function parsePlanProgress(argsRaw: string, timestamp: string): PlanProgress | null {
  const args = safeJsonParse<{ plan?: Array<{ step?: unknown; status?: unknown }> }>(argsRaw);
  const rawPlan = args?.plan;
  if (!rawPlan || rawPlan.length === 0) {
    return null;
  }

  const steps: PlanStep[] = rawPlan.map((item) => ({
    step: typeof item.step === "string" ? compactText(item.step, 180) : "Untitled step",
    status: normalizePlanStatus(item.status),
  }));

  const completed = steps.filter((step) => step.status === "completed").length;
  const inProgress = steps.filter((step) => step.status === "in_progress").length;
  const pending = steps.filter((step) => step.status === "pending" || step.status === "unknown").length;
  const total = steps.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    inProgress,
    pending,
    percent,
    lastUpdated: timestamp,
    steps,
  };
}

export function walkJsonlFiles(dir: string, options: WalkJsonlFilesOptions = {}): WalkJsonlFilesResult {
  if (!fs.existsSync(dir)) {
    return {
      files: [],
      reachedLimit: false,
    };
  }

  const maxFiles = options.maxFiles && options.maxFiles > 0 ? options.maxFiles : Number.POSITIVE_INFINITY;
  const files: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const currentDir = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
        if (files.length >= maxFiles) {
          return {
            files,
            reachedLimit: true,
          };
        }
      }
    }
  }

  return {
    files,
    reachedLimit: false,
  };
}
