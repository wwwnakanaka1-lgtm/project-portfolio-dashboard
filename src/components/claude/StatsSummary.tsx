"use client";

interface StatsSummaryProps {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  lastMonthCost: number;
  todayMessages: number;
  exchangeRate: number;
  rateSource: "api" | "fallback";
}

export function StatsSummary({
  todayCost,
  weekCost,
  monthCost,
  lastMonthCost,
  todayMessages,
  exchangeRate,
  rateSource,
}: StatsSummaryProps) {
  const formatUSD = (value: number) => `$${value.toFixed(2)}`;
  const formatJPY = (value: number) =>
    `¥${Math.round(value * exchangeRate).toLocaleString()}`;

  const stats = [
    {
      label: "今日のメッセージ",
      value: todayMessages.toString(),
      subValue: null,
      gradient: "from-blue-500 to-blue-600",
      icon: "💬",
    },
    {
      label: "今日のコスト",
      value: formatUSD(todayCost),
      subValue: formatJPY(todayCost),
      gradient: "from-green-500 to-green-600",
      icon: "📊",
    },
    {
      label: "今週のコスト",
      value: formatUSD(weekCost),
      subValue: formatJPY(weekCost),
      gradient: "from-purple-500 to-purple-600",
      icon: "📅",
    },
    {
      label: "今月のコスト",
      value: formatUSD(monthCost),
      subValue: formatJPY(monthCost),
      gradient: "from-orange-500 to-orange-600",
      icon: "🗓️",
      highlight: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br ${stat.gradient} rounded-xl p-4 text-white ${
              stat.highlight ? "ring-2 ring-orange-300 dark:ring-orange-700" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-sm opacity-80">{stat.label}</span>
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.subValue && (
              <div className="text-sm opacity-80">{stat.subValue}</div>
            )}
          </div>
        ))}
      </div>

      {/* Last month comparison */}
      {lastMonthCost > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 px-2">
          <span>
            先月のコスト: {formatUSD(lastMonthCost)} ({formatJPY(lastMonthCost)})
          </span>
          <span className="flex items-center gap-1">
            {monthCost > lastMonthCost ? (
              <>
                <span className="text-red-500">↑</span>
                <span>
                  {((monthCost / lastMonthCost - 1) * 100).toFixed(0)}% 増加
                </span>
              </>
            ) : monthCost < lastMonthCost ? (
              <>
                <span className="text-green-500">↓</span>
                <span>
                  {((1 - monthCost / lastMonthCost) * 100).toFixed(0)}% 減少
                </span>
              </>
            ) : (
              <span>変化なし</span>
            )}
          </span>
        </div>
      )}

      {/* Exchange rate info */}
      <div className="text-xs text-gray-400 dark:text-gray-500 text-right">
        為替レート: $1 = ¥{exchangeRate}{" "}
        ({rateSource === "api" ? "自動取得" : "フォールバック"})
      </div>
    </div>
  );
}
