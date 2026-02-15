"use client";

interface RateLimitData {
  usagePercent: number;
  outputTokensLimit: number | null;
  outputTokensRemaining: number | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  resetTimeStr: string;
  source: string;
  fetchedAt: string;
}

interface ProviderUsage {
  provider: "claude" | "codex";
  planName: string;
  monthlyPriceUsd: number;
  limitMessages: number;
  usedMessages: number;
  usagePercent: number;
  resetTimeStr: string;
  usageSource: "message-estimate" | "codex-rate-limit";
  confidence: "high" | "medium" | "low";
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

interface PlanUsageData {
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  resetTimeStr: string;
  claude: ProviderUsage;
  codex: ProviderUsage;
  resetTimeline: ResetTimelineEntry[];
}

interface RateLimitBarProps {
  planData: PlanUsageData | null;
  apiData: RateLimitData | null;
}

export function RateLimitBar({ planData, apiData }: RateLimitBarProps) {
  const getColorClasses = (pct: number) => {
    if (pct >= 80) return { bar: "bg-red-500", text: "text-red-500" };
    if (pct >= 50) return { bar: "bg-yellow-500", text: "text-yellow-500" };
    return { bar: "bg-blue-500", text: "text-blue-500" };
  };

  const getConfidenceClasses = (confidence: ProviderUsage["confidence"]) => {
    if (confidence === "high") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
    if (confidence === "medium") return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
    return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  };

  const formatTokens = (): string | null => {
    if (apiData) {
      if (apiData.outputTokensRemaining !== null) {
        return `出力: ${(apiData.outputTokensRemaining / 1000).toFixed(0)}K / ${(apiData.outputTokensLimit! / 1000).toFixed(0)}K`;
      }
      if (apiData.tokensRemaining !== null) {
        return `トークン: ${(apiData.tokensRemaining / 1000).toFixed(0)}K / ${(apiData.tokensLimit! / 1000).toFixed(0)}K`;
      }
    }
    return null;
  };

  const tokenDisplay = formatTokens();
  const providers = planData ? [planData.claude, planData.codex] : [];
  const driftProviders = providers.filter((provider) => provider.driftAlert);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Plan Usage (Auto {planData?.windowHours ?? 5}h Window)
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{planData?.resetTimeStr ?? "--"}</span>
      </div>

      {providers.length === 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400">Plan usage data is not available.</div>
      )}

      {providers.length > 0 && (
        <div className="space-y-3">
          {driftProviders.length > 0 && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              Drift alert:{" "}
              {driftProviders.map((provider) => `${provider.provider} ${provider.deltaPercent?.toFixed(1) ?? "--"}%`).join(", ")}
            </div>
          )}

          {providers.map((usage) => {
            const colors = getColorClasses(usage.usagePercent);
            const over = Math.max(0, usage.usedMessages - usage.limitMessages);
            const remaining = Math.max(0, usage.limitMessages - usage.usedMessages);
            const remainingPercent = Math.max(0, Math.round((100 - usage.usagePercent) * 10) / 10);

            return (
              <div key={usage.provider} className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 font-semibold ${
                        usage.provider === "claude"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {usage.provider === "claude" ? "Claude" : "Codex"}
                    </span>
                    <span>{usage.planName}</span>
                    <span className="text-gray-400 dark:text-gray-500">${usage.monthlyPriceUsd}/mo</span>
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${getConfidenceClasses(usage.confidence)}`}>
                      {usage.confidence}
                    </span>
                  </div>
                  <span className={`text-xs font-semibold ${colors.text}`}>
                    {usage.usagePercent.toFixed(1)}% used
                  </span>
                </div>

                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bar} transition-all duration-300`}
                    style={{ width: `${usage.usagePercent}%` }}
                  />
                </div>

                <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {usage.usedMessages} / {usage.limitMessages} msgs
                  </span>
                  <span className={over > 0 ? "text-red-500" : ""}>
                    {over > 0 ? `+${over} over` : `${remaining} remaining (${remainingPercent.toFixed(1)}%)`}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                  <span>{usage.resetTimeStr}</span>
                  <span>
                    {usage.usageSource === "codex-rate-limit" ? "from Codex rate limit" : "from message estimate"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                  <span>estimate {usage.estimateUsagePercent.toFixed(1)}%</span>
                  <span>
                    {usage.rateLimitUsagePercent === null
                      ? "rate-limit n/a"
                      : `rate-limit ${usage.rateLimitUsagePercent.toFixed(1)}%`}
                  </span>
                </div>
                {usage.deltaPercent !== null && (
                  <div className={`mt-1 text-[11px] ${usage.driftAlert ? "text-red-500" : "text-gray-400 dark:text-gray-500"}`}>
                    delta {usage.deltaPercent.toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tokenDisplay && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Claude API Token Limit: {tokenDisplay}
        </div>
      )}

      {apiData && (
        <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
          Claude API header usage: {apiData.usagePercent}%
        </div>
      )}

      {planData && (
        <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
          Codex uses rate_limits when available. Claude currently uses message-based estimate.
        </div>
      )}

      <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        Message limits are configurable via env: CLAUDE_MAX_X5_MESSAGES_PER_5H / CODEX_PLUS_MESSAGES_PER_5H.
      </div>
    </div>
  );
}
