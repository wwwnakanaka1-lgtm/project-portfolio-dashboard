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

interface EstimatedData {
  percent: number;
  resetStr: string;
  isSynced: boolean;
}

interface RateLimitBarProps {
  apiData: RateLimitData | null;
  estimatedData: EstimatedData;
  onSyncClick: () => void;
}

export function RateLimitBar({ apiData, estimatedData, onSyncClick }: RateLimitBarProps) {
  const useApi = apiData && apiData.usagePercent > 0;
  const percent = useApi ? apiData.usagePercent : estimatedData.percent;
  const resetStr = useApi ? apiData.resetTimeStr : estimatedData.resetStr;
  const isSynced = useApi || estimatedData.isSynced;

  const getColorClasses = (pct: number) => {
    if (pct >= 80) return { bar: "bg-red-500", text: "text-red-500" };
    if (pct >= 50) return { bar: "bg-yellow-500", text: "text-yellow-500" };
    return { bar: "bg-blue-500", text: "text-blue-500" };
  };

  const colors = getColorClasses(percent);

  const formatTokens = (): string | null => {
    if (useApi && apiData) {
      if (apiData.outputTokensRemaining !== null) {
        return `出力: ${(apiData.outputTokensRemaining / 1000).toFixed(0)}K / ${(apiData.outputTokensLimit! / 1000).toFixed(0)}K`;
      }
      if (apiData.tokensRemaining !== null) {
        return `トークン: ${(apiData.tokensRemaining / 1000).toFixed(0)}K / ${(apiData.tokensLimit! / 1000).toFixed(0)}K`;
      }
    }
    // Don't show "--" for manual sync mode - token data is not available
    return null;
  };

  const tokenDisplay = formatTokens();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${isSynced ? "border-green-500" : "border-gray-200 dark:border-gray-700"} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {useApi ? "プラン使用制限（API）" : isSynced ? "プラン使用制限（同期済み）" : "プラン使用制限（推定）"}
        </span>
        <div className="flex items-center gap-2">
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={onSyncClick}
            title="手動同期"
          >
            🔄
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">{resetStr}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors.bar} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className={`text-sm font-semibold ${colors.text}`}>{percent}%</span>
        {tokenDisplay && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{tokenDisplay}</span>
        )}
      </div>
    </div>
  );
}
