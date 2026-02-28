"use client";

interface CostBreakdownItem {
  claude: number;
  codex: number;
}

interface CostBreakdown {
  today: CostBreakdownItem;
  week: CostBreakdownItem;
  month: CostBreakdownItem;
  lastMonth: CostBreakdownItem;
}

interface MessageBreakdown {
  claude: number;
  codex: number;
}

interface StatsSummaryProps {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  lastMonthCost: number;
  todayMessages: number;
  exchangeRate: number;
  rateSource: "api" | "fallback";
  costBreakdown: CostBreakdown;
  messageBreakdown: MessageBreakdown;
}

function formatCost(cost: number): string {
  if (cost < 0.01) return "$0";
  if (cost < 1) return `$${cost.toFixed(2)}`;
  if (cost < 100) return `$${cost.toFixed(1)}`;
  return `$${Math.round(cost)}`;
}

function formatYen(cost: number, exchangeRate: number): string {
  return `￥${Math.round(cost * exchangeRate).toLocaleString()}`;
}

function BreakdownLine({
  item,
  exchangeRate,
}: {
  item: CostBreakdownItem;
  exchangeRate: number;
}) {
  return (
    <small className="block text-xs text-gray-500 dark:text-gray-400">
      Claude {formatYen(item.claude, exchangeRate)} / Codex {formatYen(item.codex, exchangeRate)}
    </small>
  );
}

export function StatsSummary({
  todayCost,
  weekCost,
  monthCost,
  lastMonthCost,
  todayMessages,
  exchangeRate,
  rateSource,
  costBreakdown,
  messageBreakdown,
}: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">{todayMessages}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今日のメッセージ</span>
        <small className="block text-xs text-gray-500 dark:text-gray-400">
          Claude {messageBreakdown.claude} / Codex {messageBreakdown.codex}
        </small>
        <small className="block text-xs text-gray-500 dark:text-gray-400">USD/JPY {exchangeRate} ({rateSource})</small>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">{formatCost(todayCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今日のコスト</span>
        <small className="block text-green-600 dark:text-green-400">{formatYen(todayCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.today} exchangeRate={exchangeRate} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">{formatCost(weekCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今週のコスト</span>
        <small className="block text-green-600 dark:text-green-400">{formatYen(weekCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.week} exchangeRate={exchangeRate} />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 text-center">
        <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCost(monthCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今月のコスト</span>
        <small className="block text-green-600 dark:text-green-400">{formatYen(monthCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.month} exchangeRate={exchangeRate} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white">{formatCost(lastMonthCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">先月のコスト</span>
        <small className="block text-gray-500">{formatYen(lastMonthCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.lastMonth} exchangeRate={exchangeRate} />
      </div>
    </div>
  );
}
