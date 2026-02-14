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
}

interface PlanUsageData {
  windowHours: number;
  resetTimeStr: string;
  claude: ProviderUsage;
  codex: ProviderUsage;
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
          {providers.map((usage) => {
            const colors = getColorClasses(usage.usagePercent);
            const over = Math.max(0, usage.usedMessages - usage.limitMessages);
            const remaining = Math.max(0, usage.limitMessages - usage.usedMessages);

            return (
              <div key={usage.provider} className="rounded-md border border-gray-200 dark:border-gray-700 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 font-semibold ${
                        usage.provider === "claude"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {usage.provider === "claude" ? "Claude" : "Codex"}
                    </span>
                    <span>{usage.planName}</span>
                    <span className="text-gray-400 dark:text-gray-500">${usage.monthlyPriceUsd}/mo</span>
                  </div>
                  <span className={`text-xs font-semibold ${colors.text}`}>{usage.usagePercent.toFixed(1)}%</span>
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
                    {over > 0 ? `+${over} over` : `${remaining} remaining`}
                  </span>
                </div>
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
          Auto-calculated from local logs in a fixed 5-hour cycle.
        </div>
      )}

      <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
        Message limits are configurable via env: CLAUDE_MAX_X5_MESSAGES_PER_5H / CODEX_PLUS_MESSAGES_PER_5H.
      </div>
    </div>
  );
}
