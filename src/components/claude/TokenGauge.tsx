"use client";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

interface TokenGaugeProps {
  tokenUsage: TokenUsage | null;
  showDetails?: boolean;
}

export function TokenGauge({ tokenUsage, showDetails = false }: TokenGaugeProps) {
  if (!tokenUsage) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500">
        トークン情報なし
      </div>
    );
  }

  const formatTokens = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  // Calculate usage percentage (based on typical context window)
  const contextLimit = 200_000; // 200K context window
  const usedTokens = tokenUsage.inputTokens + tokenUsage.cacheReadTokens;
  const usagePercent = Math.min(100, Math.round((usedTokens / contextLimit) * 100));

  // Color based on usage
  let barColor = "bg-green-500";
  if (usagePercent > 70) barColor = "bg-yellow-500";
  if (usagePercent > 90) barColor = "bg-red-500";

  return (
    <div className="space-y-1">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[36px] text-right">
          {usagePercent}%
        </span>
      </div>

      {/* Token breakdown */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex gap-2">
          <span title="出力トークン">
            <span className="text-blue-500">↑</span> {formatTokens(tokenUsage.outputTokens)}
          </span>
          <span title="入力トークン">
            <span className="text-green-500">↓</span> {formatTokens(tokenUsage.inputTokens)}
          </span>
        </div>
        {(tokenUsage.cacheReadTokens > 0 || tokenUsage.cacheCreationTokens > 0) && (
          <span title="キャッシュトークン" className="text-purple-500">
            ⚡ {formatTokens(tokenUsage.cacheReadTokens + tokenUsage.cacheCreationTokens)}
          </span>
        )}
      </div>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs grid grid-cols-2 gap-1">
          <div className="flex justify-between">
            <span className="text-gray-400">入力:</span>
            <span>{formatTokens(tokenUsage.inputTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">出力:</span>
            <span>{formatTokens(tokenUsage.outputTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">キャッシュ読取:</span>
            <span>{formatTokens(tokenUsage.cacheReadTokens)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">キャッシュ作成:</span>
            <span>{formatTokens(tokenUsage.cacheCreationTokens)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
