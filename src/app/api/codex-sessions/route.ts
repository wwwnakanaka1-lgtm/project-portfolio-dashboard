import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getCachedSync } from "@/lib/api-cache";

const SESSIONS_CACHE_TTL = 5000;
const DEFAULT_MODEL = "gpt-5.3-codex";

interface PricingPerMillion {
  input: number;
  output: number;
  cachedInput: number;
}

const DEFAULT_PRICING: PricingPerMillion = {
  input: Number(process.env.CODEX_PRICE_INPUT_PER_MTOKENS ?? 3),
  output: Number(process.env.CODEX_PRICE_OUTPUT_PER_MTOKENS ?? 15),
  cachedInput: Number(process.env.CODEX_PRICE_CACHED_INPUT_PER_MTOKENS ?? 0.3),
};

const MODEL_PRICING: Record<string, PricingPerMillion> = {
  "gpt-5.3-codex": DEFAULT_PRICING,
  "gpt-5-codex": DEFAULT_PRICING,
};

type SessionStatus = "active" | "recent" | "past";
type PlanStepStatus = "pending" | "in_progress" | "completed" | "unknown";

interface PlanStep {
  step: string;
  status: PlanStepStatus;
}

interface PlanProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percent: number;
  lastUpdated: string;
  steps: PlanStep[];
}

interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

interface CodexSession {
  id: string;
  name: string;
  created: string;
  modified: string;
  status: SessionStatus;
  minutesAgo: number;
  cwd: string;
  source: string;
  cliVersion: string;
  model: string;
  modelProvider: string;
  userMessageCount: number;
  agentMessageCount: number;
  toolCallCount: number;
  reasoningCount: number;
  lastUserMessage: string;
  lastAgentMessage: string;
  tokenUsage: TokenUsage | null;
  estimatedCostUsd: number;
  pricing: PricingPerMillion;
  progress: PlanProgress | null;
}

function getCodexSessionsRoot(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, ".codex", "sessions");
}

function walkJsonlFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
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

function pickRequestText(rawMessage: string): string {
  const lines = rawMessage
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const requestMarkerIndex = lines.findIndex((line) => line.includes("My request for Codex"));
  if (requestMarkerIndex >= 0 && lines[requestMarkerIndex + 1]) {
    return compactText(lines[requestMarkerIndex + 1], 140);
  }

  for (const line of lines) {
    if (
      line.startsWith("#") ||
      line.startsWith("<") ||
      line.startsWith("##") ||
      line.startsWith("```")
    ) {
      continue;
    }
    return compactText(line, 140);
  }

  return "Untitled session";
}

function normalizePlanStatus(status: unknown): PlanStepStatus {
  if (status === "pending" || status === "in_progress" || status === "completed") {
    return status;
  }
  return "unknown";
}

function parsePlanProgress(argsRaw: string, timestamp: string): PlanProgress | null {
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

function parseTokenUsage(totalTokenUsage: unknown): TokenUsage | null {
  if (!totalTokenUsage || typeof totalTokenUsage !== "object") {
    return null;
  }

  const usage = totalTokenUsage as Record<string, unknown>;
  const inputTokens = typeof usage.input_tokens === "number" ? usage.input_tokens : 0;
  const cachedInputTokens = typeof usage.cached_input_tokens === "number" ? usage.cached_input_tokens : 0;
  const outputTokens = typeof usage.output_tokens === "number" ? usage.output_tokens : 0;
  const reasoningOutputTokens =
    typeof usage.reasoning_output_tokens === "number" ? usage.reasoning_output_tokens : 0;
  const totalTokens = typeof usage.total_tokens === "number" ? usage.total_tokens : inputTokens + outputTokens;

  if (inputTokens === 0 && cachedInputTokens === 0 && outputTokens === 0 && reasoningOutputTokens === 0) {
    return null;
  }

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningOutputTokens,
    totalTokens,
  };
}

function getPricingForModel(model: string): PricingPerMillion {
  return MODEL_PRICING[model] ?? DEFAULT_PRICING;
}

function calculateEstimatedCost(tokenUsage: TokenUsage | null, pricing: PricingPerMillion): number {
  if (!tokenUsage) {
    return 0;
  }

  const cachedInputTokens = Math.min(tokenUsage.cachedInputTokens, tokenUsage.inputTokens);
  const nonCachedInputTokens = Math.max(0, tokenUsage.inputTokens - cachedInputTokens);
  const inputCost = (nonCachedInputTokens / 1_000_000) * pricing.input;
  const cachedInputCost = (cachedInputTokens / 1_000_000) * pricing.cachedInput;
  const outputCost = (tokenUsage.outputTokens / 1_000_000) * pricing.output;

  return Math.round((inputCost + cachedInputCost + outputCost) * 1_000_000) / 1_000_000;
}

function getSessionStatus(minutesAgo: number): SessionStatus {
  if (minutesAgo < 5) {
    return "active";
  }
  if (minutesAgo < 60) {
    return "recent";
  }
  return "past";
}

function parseSessionFile(filePath: string): CodexSession | null {
  const stats = fs.statSync(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);

  let sessionId = "";
  let created = stats.birthtime.toISOString();
  let cwd = "";
  let source = "";
  let cliVersion = "";
  let model = DEFAULT_MODEL;
  let modelProvider = "";

  let firstUserMessage = "";
  let lastUserMessage = "";
  let lastAgentMessage = "";

  let userMessageCount = 0;
  let agentMessageCount = 0;
  let toolCallCount = 0;
  let reasoningCount = 0;
  let tokenUsage: TokenUsage | null = null;

  let progress: PlanProgress | null = null;

  for (const line of lines) {
    const entry = safeJsonParse<{
      timestamp?: string;
      type?: string;
      payload?: Record<string, unknown>;
    }>(line);
    if (!entry || !entry.type) {
      continue;
    }

    if (entry.type === "session_meta") {
      const payload = entry.payload ?? {};
      if (typeof payload.id === "string") {
        sessionId = payload.id;
      }
      if (typeof payload.timestamp === "string") {
        created = payload.timestamp;
      }
      if (typeof payload.cwd === "string") {
        cwd = payload.cwd;
      }
      if (typeof payload.source === "string") {
        source = payload.source;
      }
      if (typeof payload.cli_version === "string") {
        cliVersion = payload.cli_version;
      }
      if (typeof payload.model === "string") {
        model = payload.model;
      }
      if (typeof payload.model_provider === "string") {
        modelProvider = payload.model_provider;
      }
      continue;
    }

    if (entry.type === "turn_context") {
      const payload = entry.payload ?? {};
      if (typeof payload.model === "string") {
        model = payload.model;
      }
      continue;
    }

    if (entry.type === "event_msg") {
      const payload = entry.payload ?? {};
      const eventType = payload.type;

      if (eventType === "user_message") {
        userMessageCount++;
        if (typeof payload.message === "string") {
          const message = payload.message;
          if (!firstUserMessage) {
            firstUserMessage = message;
          }
          lastUserMessage = message;
        }
        continue;
      }

      if (eventType === "agent_message") {
        agentMessageCount++;
        if (typeof payload.message === "string") {
          lastAgentMessage = payload.message;
        }
        continue;
      }

      if (eventType === "agent_reasoning") {
        reasoningCount++;
      }

      if (eventType === "token_count") {
        const info = payload.info;
        if (info && typeof info === "object") {
          const infoObject = info as Record<string, unknown>;
          const parsedTokenUsage = parseTokenUsage(infoObject.total_token_usage);
          if (parsedTokenUsage) {
            tokenUsage = parsedTokenUsage;
          }
        }
      }
      continue;
    }

    if (entry.type === "response_item") {
      const payload = entry.payload ?? {};
      if (payload.type === "function_call") {
        toolCallCount++;
        if (payload.name === "update_plan" && typeof payload.arguments === "string") {
          const parsed = parsePlanProgress(
            payload.arguments,
            typeof entry.timestamp === "string" ? entry.timestamp : stats.mtime.toISOString()
          );
          if (parsed) {
            progress = parsed;
          }
        }
      }
      continue;
    }
  }

  if (!sessionId) {
    const fileName = path.basename(filePath, ".jsonl");
    sessionId = fileName.replace(/^rollout-[^-]+-/, "");
  }

  const modified = stats.mtime.toISOString();
  const minutesAgo = Math.max(0, Math.round((Date.now() - stats.mtime.getTime()) / 1000 / 60));
  const status = getSessionStatus(minutesAgo);
  const pricing = getPricingForModel(model);
  const estimatedCostUsd = calculateEstimatedCost(tokenUsage, pricing);

  const displayNameSource = firstUserMessage || lastUserMessage || lastAgentMessage || sessionId;
  const name = pickRequestText(displayNameSource);

  return {
    id: sessionId,
    name,
    created,
    modified,
    status,
    minutesAgo,
    cwd,
    source,
    cliVersion,
    model,
    modelProvider,
    userMessageCount,
    agentMessageCount,
    toolCallCount,
    reasoningCount,
    lastUserMessage: compactText(lastUserMessage, 220),
    lastAgentMessage: compactText(lastAgentMessage, 220),
    tokenUsage,
    estimatedCostUsd,
    pricing,
    progress,
  };
}

function readCodexSessions(): CodexSession[] {
  return getCachedSync("codex-sessions-list", SESSIONS_CACHE_TTL, () => {
    const root = getCodexSessionsRoot();
    const files = walkJsonlFiles(root);
    const sessions = files
      .map((filePath) => {
        try {
          return parseSessionFile(filePath);
        } catch {
          return null;
        }
      })
      .filter((session): session is CodexSession => session !== null)
      .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return sessions;
  });
}

export async function GET() {
  try {
    const sessions = readCodexSessions();
    const grouped = {
      active: sessions.filter((session) => session.status === "active"),
      recent: sessions.filter((session) => session.status === "recent"),
      past: sessions.filter((session) => session.status === "past"),
    };

    const summary = {
      totalSessions: sessions.length,
      activeSessions: grouped.active.length,
      recentSessions: grouped.recent.length,
      totalToolCalls: sessions.reduce((sum, session) => sum + session.toolCallCount, 0),
      totalMessages: sessions.reduce(
        (sum, session) => sum + session.userMessageCount + session.agentMessageCount,
        0
      ),
      totalInputTokens: sessions.reduce((sum, session) => sum + (session.tokenUsage?.inputTokens ?? 0), 0),
      totalCachedInputTokens: sessions.reduce(
        (sum, session) => sum + (session.tokenUsage?.cachedInputTokens ?? 0),
        0
      ),
      totalOutputTokens: sessions.reduce((sum, session) => sum + (session.tokenUsage?.outputTokens ?? 0), 0),
      totalReasoningTokens: sessions.reduce(
        (sum, session) => sum + (session.tokenUsage?.reasoningOutputTokens ?? 0),
        0
      ),
      totalTokens: sessions.reduce((sum, session) => sum + (session.tokenUsage?.totalTokens ?? 0), 0),
      totalEstimatedCostUsd: Math.round(
        sessions.reduce((sum, session) => sum + session.estimatedCostUsd, 0) * 1_000_000
      ) / 1_000_000,
      sessionsWithPlan: sessions.filter((session) => session.progress !== null).length,
      pricingDefaults: DEFAULT_PRICING,
    };

    return NextResponse.json({
      sessions,
      grouped,
      summary,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching codex sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch codex sessions", details: String(error) },
      { status: 500 }
    );
  }
}
