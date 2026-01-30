"use client";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  tokens: TokenUsage;
  cost: number;
}

interface MonthlySummary {
  month: string;
  cost: number;
  days: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

interface UsageHistoryTabProps {
  dailyActivity: DailyActivity[];
  monthlySummary: MonthlySummary[];
  exchangeRate: number;
}

export function UsageHistoryTab({ dailyActivity, monthlySummary, exchangeRate }: UsageHistoryTabProps) {
  // Get last 30 days of daily activity
  const last30Days = dailyActivity.slice(-30);
  const maxDailyCost = Math.max(...last30Days.map((d) => d.cost), 1);

  // Get last 12 months
  const last12Months = monthlySummary.slice(-12);
  const maxMonthlyCost = Math.max(...last12Months.map((m) => m.cost), 1);

  const formatMonth = (monthStr: string) => {
    const [, month] = monthStr.split("-");
    return `${month}月`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
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

  return (
    <>
      {/* Monthly Chart */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">月別使用量</h2>
        <div className="flex items-end justify-around gap-2 h-56">
          {last12Months.map((month) => {
            const height = Math.max(10, (month.cost / maxMonthlyCost) * 180);
            return (
              <div key={month.month} className="flex flex-col items-center">
                <div
                  className="w-8 bg-blue-500 rounded-t transition-all duration-300 relative group cursor-pointer"
                  style={{ height: `${height}px` }}
                  title={`${month.month}: $${month.cost.toFixed(2)} (¥${Math.round(month.cost * exchangeRate).toLocaleString()})`}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    ${month.cost.toFixed(0)}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatMonth(month.month)}</span>
                <span className="text-xs text-green-600 dark:text-green-400">¥{Math.round(month.cost * exchangeRate).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Daily Chart */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">日別使用量（過去30日）</h2>
        <div className="flex items-end justify-around gap-0.5 h-28 overflow-x-auto">
          {last30Days.map((day) => {
            const height = Math.max(2, (day.cost / maxDailyCost) * 80);
            return (
              <div
                key={day.date}
                className="flex flex-col items-center min-w-[12px]"
                title={`${day.date}: $${day.cost.toFixed(2)} (${day.messageCount}メッセージ)`}
              >
                <div
                  className="w-2 bg-green-500 rounded-t transition-all duration-300"
                  style={{ height: `${height}px` }}
                />
                <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 rotate-45 origin-left">
                  {formatDate(day.date)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Monthly Summary Table */}
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">月別サマリー</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">月</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">日数</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">入力トークン</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">出力トークン</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">コスト</th>
              </tr>
            </thead>
            <tbody>
              {[...monthlySummary].reverse().map((month) => (
                <tr key={month.month} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="py-2 px-3 text-gray-900 dark:text-white">{month.month}</td>
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{month.days}日</td>
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{formatTokens(month.inputTokens)}</td>
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{formatTokens(month.outputTokens)}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-gray-900 dark:text-white">${month.cost.toFixed(2)}</span>
                    <span className="text-xs text-green-600 dark:text-green-400 ml-1">
                      (¥{Math.round(month.cost * exchangeRate).toLocaleString()})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
