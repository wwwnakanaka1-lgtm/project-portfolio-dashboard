"use client";

interface ApiUsageData {
  today: { tokens: { input: number; output: number }; cost: number };
  month: { tokens: { input: number; output: number }; cost: number };
  source: string;
  fetchedAt: string;
}

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

interface ApiUsageSectionProps {
  data: ApiUsageData;
  rateLimitData: RateLimitData | null;
  exchangeRate: number;
}

export function ApiUsageSection({ data, rateLimitData, exchangeRate }: ApiUsageSectionProps) {
  const percent = rateLimitData?.usagePercent || 0;

  const getColorClasses = (pct: number) => {
    if (pct >= 80) return { bar: "bg-red-500", text: "text-red-500" };
    if (pct >= 50) return { bar: "bg-yellow-500", text: "text-yellow-500" };
    return { bar: "bg-blue-500", text: "text-blue-500" };
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    }
    return tokens.toString();
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  const colors = getColorClasses(percent);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          API使用量（Anthropic API）
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(data.fetchedAt).toLocaleTimeString("ja-JP")}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {/* Rate Limit Card */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">レート制限</div>
          <div className={`text-2xl font-bold ${colors.text}`}>{percent}%</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {rateLimitData?.resetTimeStr || "--"}
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full ${colors.bar} transition-all duration-300`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Today Card */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">今日</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCost(data.today.cost)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatTokens(data.today.tokens.input + data.today.tokens.output)} tokens
          </div>
        </div>

        {/* Month Card */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">今月</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCost(data.month.cost)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatTokens(data.month.tokens.input + data.month.tokens.output)} tokens
          </div>
        </div>
      </div>
    </div>
  );
}
