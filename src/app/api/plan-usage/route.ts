import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getCachedSync } from "@/lib/api-cache";
import {
  buildRollingWindowTimeline,
  calculateRollingWindowFromMessageTimestamps,
  type RollingWindowUsage,
} from "@/lib/rolling-window";

const PLAN_USAGE_CACHE_TTL = 10000;
const WINDOW_HOURS = 5;
const WINDOW_MS = WINDOW_HOURS * 60 * 60 * 1000;
const CODEX_RATE_LIMIT_SCAN_FILES = Number(process.env.CODEX_RATE_LIMIT_SCAN_FILES ?? 30);

const CLAUDE_LIMIT_MESSAGES_PER_WINDOW = Number(process.env.CLAUDE_MAX_X5_MESSAGES_PER_5H ?? 225);
const CODEX_LIMIT_MESSAGES_PER_WINDOW = Number(process.env.CODEX_PLUS_MESSAGES_PER_5H ?? 200);

const CLAUDE_MONTHLY_PLAN_USD = Number(process.env.CLAUDE_MAX_X5_MONTHLY_USD ?? 100);
const CODEX_MONTHLY_PLAN_USD = Number(process.env.CODEX_PLUS_MONTHLY_USD ?? 20);
const WAITING_NEXT_MESSAGE_RESET_STR = "Waiting for next message";
const DRIFT_ALERT_THRESHOLD_PERCENT = 10;

type UsageConfidence = "high" | "medium" | "low";

interface ProviderUsage {
  provider: "claude" | "codex";
  planName: string;
  monthlyPriceUsd: number;
  limitMessages: number;
  usedMessages: number;
  usagePercent: number;
  resetTimeStr: string;
  usageSource: "message-estimate" | "codex-rate-limit";
  confidence: UsageConfidence;
  estimateUsagePercent: number;
  rateLimitUsagePercent: number | null;
  deltaPercent: number | null;
  driftAlert: boolean;
  firstMessageAfterReset: string | null;
}

interface ResetTimelineEntry {
  provider: "claude" | "codex";
  windowStart: string;
  windowEnd: string;
  firstMessageAfterReset: string;
  messageCount: number;
  active: boolean;
}

interface PlanUsageResult {
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  resetTimeStr: string;
  claude: ProviderUsage;
  codex: ProviderUsage;
  resetTimeline: ResetTimelineEntry[];
  source: string;
  generatedAt: string;
}

interface CodexRateLimitSnapshot {
  usedPercent: number;
  windowMinutes: number;
  resetsAtSec: number;
  observedAtMs: number;
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

function parseCodexRateLimitEntry(entry: Record<string, unknown>): CodexRateLimitSnapshot | null {
  if (entry.type !== "event_msg") {
    return null;
  }

  const payload = entry.payload as Record<string, unknown> | undefined;
  if (!payload || payload.type !== "token_count") {
    return null;
  }

  const rateLimits = payload.rate_limits as Record<string, unknown> | undefined;
  if (!rateLimits) {
    return null;
  }

  const primary = rateLimits.primary as Record<string, unknown> | undefined;
  if (!primary) {
    return null;
  }

  const usedPercent = typeof primary.used_percent === "number" ? primary.used_percent : null;
  const windowMinutes = typeof primary.window_minutes === "number" ? primary.window_minutes : null;
  const resetsAtSec = typeof primary.resets_at === "number" ? primary.resets_at : null;
  const observedAtMs = parseTimestamp(entry.timestamp);

  if (
    usedPercent === null ||
    windowMinutes === null ||
    resetsAtSec === null ||
    observedAtMs === null ||
    Number.isNaN(usedPercent) ||
    Number.isNaN(windowMinutes) ||
    Number.isNaN(resetsAtSec)
  ) {
    return null;
  }

  // Keep only the 5-hour window.
  if (windowMinutes !== 300) {
    return null;
  }

  return {
    usedPercent,
    windowMinutes,
    resetsAtSec,
    observedAtMs,
  };
}

function findLatestCodexRateLimit(): CodexRateLimitSnapshot | null {
  const codexRoot = path.join(os.homedir(), ".codex", "sessions");
  const allFiles = walkJsonlFiles(codexRoot);

  if (allFiles.length === 0) {
    return null;
  }

  const filesWithMtime: Array<{ filePath: string; mtimeMs: number }> = [];
  for (const filePath of allFiles) {
    try {
      filesWithMtime.push({ filePath, mtimeMs: fs.statSync(filePath).mtimeMs });
    } catch {
      // Ignore transient file errors and continue.
    }
  }

  const recentFiles = filesWithMtime
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
    .slice(0, CODEX_RATE_LIMIT_SCAN_FILES)
    .map((item) => item.filePath);

  let latest: CodexRateLimitSnapshot | null = null;

  for (const filePath of recentFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      let entry: Record<string, unknown>;
      try {
        entry = JSON.parse(lines[i]) as Record<string, unknown>;
      } catch {
        continue;
      }

      const parsed = parseCodexRateLimitEntry(entry);
      if (!parsed) {
        continue;
      }

      if (!latest || parsed.observedAtMs > latest.observedAtMs) {
        latest = parsed;
      }
      break;
    }
  }

  return latest;
}

function collectMessageTimestampsFromJsonl(
  files: string[],
  predicate: (entry: Record<string, unknown>) => boolean
): number[] {
  const timestamps: number[] = [];

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

      if (!predicate(entry)) {
        continue;
      }

      const timestamp = parseTimestamp(entry.timestamp);
      if (timestamp !== null) {
        timestamps.push(timestamp);
      }
    }
  }

  return timestamps;
}

function getClaudeMessageTimestamps(): number[] {
  const projectDir = getClaudeProjectDir();
  if (!projectDir) {
    return [];
  }

  const files = getClaudeSessionFiles(projectDir);
  return collectMessageTimestampsFromJsonl(files, (entry) => entry.type === "user");
}

function getCodexMessageTimestamps(): number[] {
  const codexRoot = path.join(os.homedir(), ".codex", "sessions");
  const files = walkJsonlFiles(codexRoot);

  return collectMessageTimestampsFromJsonl(files, (entry) => {
    if (entry.type !== "event_msg") {
      return false;
    }
    const payload = entry.payload as Record<string, unknown> | undefined;
    return payload?.type === "user_message";
  });
}

function formatResetTimeFromWindow(windowUsage: RollingWindowUsage): string {
  if (!windowUsage.hasActiveWindow) {
    return WAITING_NEXT_MESSAGE_RESET_STR;
  }
  return formatResetTime(windowUsage.resetMs);
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function calculateConfidence(
  usageSource: "message-estimate" | "codex-rate-limit",
  usedMessages: number,
  deltaPercent: number | null
): UsageConfidence {
  if (usageSource === "codex-rate-limit" && deltaPercent !== null) {
    if (deltaPercent <= 5) {
      return "high";
    }
    if (deltaPercent <= 10) {
      return "medium";
    }
    return "low";
  }

  if (usedMessages > 0) {
    return "medium";
  }
  return "low";
}

function buildProviderUsage(
  provider: "claude" | "codex",
  planName: string,
  monthlyPriceUsd: number,
  limitMessages: number,
  usedMessages: number,
  resetTimeStr: string,
  usageSource: "message-estimate" | "codex-rate-limit",
  estimateUsagePercent: number,
  rateLimitUsagePercent: number | null,
  firstMessageAfterResetMs: number | null
): ProviderUsage {
  const estimate = roundOne(clampPercent(estimateUsagePercent));
  const rateLimit = rateLimitUsagePercent === null ? null : roundOne(clampPercent(rateLimitUsagePercent));
  const usagePercent = rateLimit ?? estimate;
  const deltaPercent = rateLimit === null ? null : roundOne(Math.abs(rateLimit - estimate));
  const driftAlert = deltaPercent !== null && deltaPercent > DRIFT_ALERT_THRESHOLD_PERCENT;

  return {
    provider,
    planName,
    monthlyPriceUsd,
    limitMessages,
    usedMessages,
    usagePercent,
    resetTimeStr,
    usageSource,
    confidence: calculateConfidence(usageSource, usedMessages, deltaPercent),
    estimateUsagePercent: estimate,
    rateLimitUsagePercent: rateLimit,
    deltaPercent,
    driftAlert,
    firstMessageAfterReset:
      firstMessageAfterResetMs === null ? null : new Date(firstMessageAfterResetMs).toISOString(),
  };
}

function calculatePlanUsage(): PlanUsageResult {
  const nowMs = Date.now();
  const claudeMessageTimestamps = getClaudeMessageTimestamps();
  const codexMessageTimestamps = getCodexMessageTimestamps();

  const claudeWindowUsage = calculateRollingWindowFromMessageTimestamps(
    claudeMessageTimestamps,
    nowMs,
    WINDOW_MS
  );
  const claudeUsedMessages = claudeWindowUsage.usedMessages;
  const claudeResetStr = formatResetTimeFromWindow(claudeWindowUsage);
  const claudeEstimateUsagePercent =
    CLAUDE_LIMIT_MESSAGES_PER_WINDOW > 0
      ? (claudeUsedMessages / CLAUDE_LIMIT_MESSAGES_PER_WINDOW) * 100
      : 0;

  const codexRateLimit = findLatestCodexRateLimit();
  const codexWindowUsage = calculateRollingWindowFromMessageTimestamps(
    codexMessageTimestamps,
    nowMs,
    WINDOW_MS
  );
  const codexEstimateUsagePercent =
    CODEX_LIMIT_MESSAGES_PER_WINDOW > 0
      ? (codexWindowUsage.usedMessages / CODEX_LIMIT_MESSAGES_PER_WINDOW) * 100
      : 0;
  const codexRateLimitResetMs =
    codexRateLimit === null ? null : codexRateLimit.resetsAtSec * 1000 - nowMs;
  const codexRateLimitActive = codexRateLimit !== null && (codexRateLimitResetMs ?? 0) > 0;

  const codexUsedMessagesFromRateLimit =
    !codexRateLimitActive || codexRateLimit === null
      ? null
      : Math.round((Math.max(0, Math.min(100, codexRateLimit.usedPercent)) / 100) * CODEX_LIMIT_MESSAGES_PER_WINDOW);
  const codexUsedMessages = codexUsedMessagesFromRateLimit ?? codexWindowUsage.usedMessages;
  const codexRateLimitUsagePercent = codexRateLimitActive && codexRateLimit ? codexRateLimit.usedPercent : null;
  const codexResetStr = codexRateLimitActive
    ? formatResetTime(Math.max(0, codexRateLimitResetMs ?? 0))
    : formatResetTimeFromWindow(codexWindowUsage);

  const codexWindowStartMs =
    codexRateLimitActive && codexRateLimit
      ? codexRateLimit.resetsAtSec * 1000 - WINDOW_MS
      : codexWindowUsage.windowStartMs;
  const codexWindowEndMs =
    codexRateLimitActive && codexRateLimit
      ? codexRateLimit.resetsAtSec * 1000
      : codexWindowUsage.windowEndMs;

  const referenceWindowStartMs = codexWindowStartMs ?? claudeWindowUsage.windowStartMs ?? nowMs;
  const referenceWindowEndMs = codexWindowEndMs ?? claudeWindowUsage.windowEndMs ?? nowMs;
  const combinedResetStr =
    codexRateLimitActive || codexWindowUsage.hasActiveWindow
      ? `Codex ${codexResetStr}`
      : claudeWindowUsage.hasActiveWindow
        ? `Claude ${claudeResetStr}`
        : WAITING_NEXT_MESSAGE_RESET_STR;

  const resetTimeline: ResetTimelineEntry[] = [
    ...buildRollingWindowTimeline(claudeMessageTimestamps, nowMs, WINDOW_MS, 3).map((entry) => ({
      provider: "claude" as const,
      windowStart: new Date(entry.windowStartMs).toISOString(),
      windowEnd: new Date(entry.windowEndMs).toISOString(),
      firstMessageAfterReset: new Date(entry.firstMessageAtMs).toISOString(),
      messageCount: entry.messageCount,
      active: entry.isActive,
    })),
    ...buildRollingWindowTimeline(codexMessageTimestamps, nowMs, WINDOW_MS, 3).map((entry) => ({
      provider: "codex" as const,
      windowStart: new Date(entry.windowStartMs).toISOString(),
      windowEnd: new Date(entry.windowEndMs).toISOString(),
      firstMessageAfterReset: new Date(entry.firstMessageAtMs).toISOString(),
      messageCount: entry.messageCount,
      active: entry.isActive,
    })),
  ].sort((a, b) => b.windowStart.localeCompare(a.windowStart));

  return {
    windowHours: WINDOW_HOURS,
    windowStart: new Date(referenceWindowStartMs).toISOString(),
    windowEnd: new Date(referenceWindowEndMs).toISOString(),
    resetTimeStr: combinedResetStr,
    claude: buildProviderUsage(
      "claude",
      "Claude Max x5",
      CLAUDE_MONTHLY_PLAN_USD,
      CLAUDE_LIMIT_MESSAGES_PER_WINDOW,
      claudeUsedMessages,
      claudeResetStr,
      "message-estimate",
      claudeEstimateUsagePercent,
      null,
      claudeWindowUsage.windowStartMs
    ),
    codex: buildProviderUsage(
      "codex",
      "Codex Plus",
      CODEX_MONTHLY_PLAN_USD,
      CODEX_LIMIT_MESSAGES_PER_WINDOW,
      codexUsedMessages,
      codexResetStr,
      codexRateLimitActive ? "codex-rate-limit" : "message-estimate",
      codexEstimateUsagePercent,
      codexRateLimitUsagePercent,
      codexWindowUsage.windowStartMs
    ),
    resetTimeline,
    source: codexRateLimitActive ? "codex-rate-limit+local-jsonl" : "local-jsonl",
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
