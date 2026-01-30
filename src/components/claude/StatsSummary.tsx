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
  const formatCost = (cost: number) => {
    if (cost < 0.01) return "$0";
    if (cost < 1) return `$${cost.toFixed(2)}`;
    if (cost < 100) return `$${cost.toFixed(1)}`;
    return `$${Math.round(cost)}`;
  };

  const formatJpy = (cost: number) => {
    const jpy = Math.round(cost * exchangeRate);
    if (jpy < 1000) return `¥${jpy}`;
    return `¥${jpy.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">
          {todayMessages}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          今日のメッセージ
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">
          {formatCost(todayCost)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          今日のコスト
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">
          {formatCost(weekCost)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          今週のコスト
        </span>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 text-center">
        <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">
          {formatCost(monthCost)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          今月のコスト
          <br />
          <small className="text-green-600 dark:text-green-400">{formatJpy(monthCost)}</small>
        </span>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">
          {formatCost(lastMonthCost)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          先月のコスト
          <br />
          <small className="text-gray-500">{formatJpy(lastMonthCost)}</small>
        </span>
      </div>
    </div>
  );
}
