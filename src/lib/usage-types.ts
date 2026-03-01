// Claude Code usage statistics types

export interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
}

export interface DailyModelTokens {
  date: string;
  tokensByModel: Record<string, number>;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
  contextWindow: number;
  maxOutputTokens?: number;
}

export interface LongestSession {
  sessionId: string;
  duration: number;
  messageCount: number;
  timestamp: string;
}

export interface ClaudeUsageStats {
  version: number;
  lastComputedDate: string;
  dailyActivity: DailyActivity[];
  dailyModelTokens: DailyModelTokens[];
  modelUsage: Record<string, ModelUsage>;
  totalSessions: number;
  totalMessages: number;
  longestSession: LongestSession;
  firstSessionDate: string;
  hourCounts: Record<string, number>;
}

/** Pricing per 1M tokens (USD) for each Claude model. */
export const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
  "claude-opus-4-5-20251101": {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheCreate: 18.75,
  },
  "claude-opus-4-6": {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheCreate: 18.75,
  },
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheCreate: 3.75,
  },
  "claude-haiku-4-5-20251001": {
    input: 0.8,
    output: 4,
    cacheRead: 0.08,
    cacheCreate: 1,
  },
  "<synthetic>": {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheCreate: 0,
  },
};

/**
 * Normalize a raw model ID to a human-readable display name.
 * Used across UI components and exports to ensure consistency.
 */
export function normalizeModelName(model: string): string {
  if (model.includes("opus-4-6")) return "Opus 4.6";
  if (model.includes("opus-4-5")) return "Opus 4.5";
  if (model.includes("opus")) return "Opus";
  if (model.includes("sonnet-4-6")) return "Sonnet 4.6";
  if (model.includes("sonnet-4-5")) return "Sonnet 4.5";
  if (model.includes("sonnet")) return "Sonnet";
  if (model.includes("haiku-4-5")) return "Haiku 4.5";
  if (model.includes("haiku")) return "Haiku";
  if (model === "<synthetic>") return "Synthetic (System)";
  return model;
}

/**
 * Get pricing for a model with fallback logic.
 * Falls back to Opus pricing for unknown opus models, Haiku for haiku models,
 * and Sonnet pricing as the default.
 */
export function getPricing(model: string) {
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  if (model.includes("opus")) {
    return MODEL_PRICING["claude-opus-4-5-20251101"];
  }
  if (model.includes("haiku")) {
    return MODEL_PRICING["claude-haiku-4-5-20251001"];
  }
  return MODEL_PRICING["claude-sonnet-4-5-20250929"];
}

/**
 * Calculate estimated cost (USD) from token usage and model.
 * Uses Opus pricing as default when model is not specified.
 */
export function calculateCost(
  tokens: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheCreationTokens: number },
  model: string = "claude-opus-4-5-20251101"
): number {
  const pricing = getPricing(model);
  return (
    (tokens.inputTokens / 1e6) * pricing.input +
    (tokens.outputTokens / 1e6) * pricing.output +
    (tokens.cacheReadTokens / 1e6) * pricing.cacheRead +
    (tokens.cacheCreationTokens / 1e6) * pricing.cacheCreate
  );
}

export interface CostBreakdown {
  model: string;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheCreationCost: number;
  totalCost: number;
  totalTokens: number;
}

export interface UsageSummary {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  costByModel: CostBreakdown[];
  dailyActivity: DailyActivity[];
  recentDays: number;
}
