import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getCachedSync } from "@/lib/api-cache";

const PLAN_USAGE_CACHE_TTL = 10000;
const WINDOW_HOURS = 5;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;

const CLAUDE_LIMIT_MESSAGES_PER_WINDOW = Number(process.env.CLAUDE_MAX_X5_MESSAGES_PER_5H ?? 225);
const CODEX_LIMIT_MESSAGES_PER_WINDOW = Number(process.env.CODEX_PLUS_MESSAGES_PER_5H ?? 200);

const CLAUDE_MONTHLY_PLAN_USD = Number(process.env.CLAUDE_MAX_X5_MONTHLY_USD ?? 100);
const CODEX_MONTHLY_PLAN_USD = Number(process.env.CODEX_PLUS_MONTHLY_USD ?? 20);

interface ProviderUsage {
  provider: "claude" | "codex";
  planName: string;
  monthlyPriceUsd: number;
  limitMessages: number;
  usedMessages: number;
  usagePercent: number;
}

interface PlanUsageResult {
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  resetTimeStr: string;
  claude: ProviderUsage;
  codex: ProviderUsage;
  source: string;
  generatedAt: string;
}

function formatResetTime(resetMs: number): string {
  const hours = Math.floor(resetMs / (1000 * 60 * 60));
  const minutes = Math.floor((resetMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m until reset`;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return timestamp;
}

function normalizePath(rawPath: string): string | null {
  if (fs.existsSync(rawPath)) {
    return rawPath;
  }

  const candidates = [
    rawPath.replace(/c--Users-wwwhi/i, "C--Users-wwwhi"),
    rawPath.replace(/C--Users-wwwhi/i, "c--Users-wwwhi"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function addUniquePath(paths: Map<string, string>, rawPath: string): void {
  const normalized = normalizePath(rawPath);
  if (!normalized) {
    return;
  }
  paths.set(normalized.toLowerCase(), normalized);
}

function getClaudeProjectDir(): string | null {
  const projectsDir = path.join(os.homedir(), ".claude", "projects");
  const candidates = ["C--Users-wwwhi", "c--Users-wwwhi"];
  for (const candidate of candidates) {
    const projectDir = path.join(projectsDir, candidate);
    if (fs.existsSync(projectDir)) {
      return projectDir;
    }
  }
  return null;
}

function getClaudeSessionFiles(projectDir: string): string[] {
  const files = new Map<string, string>();
  const sessionsIndexPath = path.join(projectDir, "sessions-index.json");

  if (fs.existsSync(sessionsIndexPath)) {
    try {
      const raw = fs.readFileSync(sessionsIndexPath, "utf8");
      const parsed = JSON.parse(raw) as { entries?: Array<{ fullPath?: string }> };
      for (const entry of parsed.entries ?? []) {
        if (typeof entry.fullPath === "string") {
          addUniquePath(files, entry.fullPath);
        }
      }
    } catch {
      // Ignore malformed sessions-index.json and continue with fallback files.
    }
  }

  for (const fileName of fs.readdirSync(projectDir)) {
    if (fileName.endsWith(".jsonl")) {
      addUniquePath(files, path.join(projectDir, fileName));
    }
  }

  return Array.from(files.values());
}

function walkJsonlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonlFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      files.push(fullPath);
    }
  }
  return files;
}

function countMessagesFromJsonl(
  files: string[],
  windowStartMs: number,
  windowEndMs: number,
  predicate: (entry: Record<string, unknown>) => boolean
): number {
  let count = 0;

  for (const filePath of files) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      let entry: Record<string, unknown>;
      try {
        entry = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }

      const timestamp = parseTimestamp(entry.timestamp);
      if (timestamp === null || timestamp < windowStartMs || timestamp >= windowEndMs) {
        continue;
      }
      if (predicate(entry)) {
        count += 1;
      }
    }
  }

  return count;
}

function countClaudeMessages(windowStartMs: number, windowEndMs: number): number {
  const projectDir = getClaudeProjectDir();
  if (!projectDir) {
    return 0;
  }

  const files = getClaudeSessionFiles(projectDir);
  return countMessagesFromJsonl(
    files,
    windowStartMs,
    windowEndMs,
    (entry) => entry.type === "user"
  );
}

function countCodexMessages(windowStartMs: number, windowEndMs: number): number {
  const codexRoot = path.join(os.homedir(), ".codex", "sessions");
  const files = walkJsonlFiles(codexRoot);

  return countMessagesFromJsonl(files, windowStartMs, windowEndMs, (entry) => {
    if (entry.type !== "event_msg") {
      return false;
    }
    const payload = entry.payload as Record<string, unknown> | undefined;
    return payload?.type === "user_message";
  });
}

function buildProviderUsage(
  provider: "claude" | "codex",
  planName: string,
  monthlyPriceUsd: number,
  limitMessages: number,
  usedMessages: number
): ProviderUsage {
  const usagePercentRaw = limitMessages > 0 ? (usedMessages / limitMessages) * 100 : 0;
  const usagePercent = Math.min(100, Math.max(0, Math.round(usagePercentRaw * 10) / 10));

  return {
    provider,
    planName,
    monthlyPriceUsd,
    limitMessages,
    usedMessages,
    usagePercent,
  };
}

function calculatePlanUsage(): PlanUsageResult {
  const nowMs = Date.now();
  const windowStartMs = Math.floor(nowMs / WINDOW_MS) * WINDOW_MS;
  const windowEndMs = windowStartMs + WINDOW_MS;
  const resetMs = Math.max(0, windowEndMs - nowMs);

  const claudeUsedMessages = countClaudeMessages(windowStartMs, windowEndMs);
  const codexUsedMessages = countCodexMessages(windowStartMs, windowEndMs);

  return {
    windowHours: WINDOW_HOURS,
    windowStart: new Date(windowStartMs).toISOString(),
    windowEnd: new Date(windowEndMs).toISOString(),
    resetTimeStr: formatResetTime(resetMs),
    claude: buildProviderUsage(
      "claude",
      "Claude Max x5",
      CLAUDE_MONTHLY_PLAN_USD,
      CLAUDE_LIMIT_MESSAGES_PER_WINDOW,
      claudeUsedMessages
    ),
    codex: buildProviderUsage(
      "codex",
      "Codex Plus",
      CODEX_MONTHLY_PLAN_USD,
      CODEX_LIMIT_MESSAGES_PER_WINDOW,
      codexUsedMessages
    ),
    source: "local-jsonl",
    generatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const result = getCachedSync("plan-usage", PLAN_USAGE_CACHE_TTL, calculatePlanUsage);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to calculate plan usage",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
