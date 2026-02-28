"use client";

import { memo, useMemo } from "react";
import { forecastMonthlyCost, type CostForecast } from "@/lib/cost-forecast";

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

interface DailyActivity {
  date: string;
  cost: number;
  messageCount: number;
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
  dailyActivity?: DailyActivity[];
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

function TrendBadge({ forecast }: { forecast: CostForecast }) {
  const trendIcon = forecast.trend === "increasing" ? "↑" : forecast.trend === "decreasing" ? "↓" : "→";
  const trendColor =
    forecast.trend === "increasing"
      ? "text-red-500"
      : forecast.trend === "decreasing"
        ? "text-green-500"
        : "text-gray-500";

  return (
    <div className="mt-1">
      <small className="block text-xs text-gray-500 dark:text-gray-400">
        月末予測: {formatCost(forecast.projectedMonthEnd)}
      </small>
      <small className={`text-xs ${trendColor}`}>
        {trendIcon} {forecast.trend === "increasing" ? "増加傾向" : forecast.trend === "decreasing" ? "減少傾向" : "横ばい"}
        {forecast.confidence !== "low" && ` (${forecast.confidence})`}
      </small>
    </div>
  );
}

/** Cost summary cards showing today/week/month/last month costs with breakdown. */
export const StatsSummary = memo(function StatsSummary({
  todayCost,
  weekCost,
  monthCost,
  lastMonthCost,
  todayMessages,
  exchangeRate,
  rateSource,
  costBreakdown,
  messageBreakdown,
  dailyActivity,
}: StatsSummaryProps) {
  const forecast = useMemo(() => {
    if (!dailyActivity || dailyActivity.length < 3) return null;
    try {
      return forecastMonthlyCost(dailyActivity, monthCost);
    } catch {
      return null;
    }
  }, [dailyActivity, monthCost]);

  return (
    <div className="grid grid-cols-5 gap-4">
      <div className="glass-card rounded-xl p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white animate-count-up">{todayMessages}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今日のメッセージ</span>
        <small className="block text-xs text-gray-500 dark:text-gray-400">
          Claude {messageBreakdown.claude} / Codex {messageBreakdown.codex}
        </small>
        <small className="block text-xs text-gray-500 dark:text-gray-400">USD/JPY {exchangeRate} ({rateSource})</small>
      </div>

      <div className="glass-card rounded-xl p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white animate-count-up">{formatCost(todayCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今日のコスト</span>
        <small className="block text-green-600 dark:text-green-400">{formatYen(todayCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.today} exchangeRate={exchangeRate} />
      </div>

      <div className="glass-card rounded-xl p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white animate-count-up">{formatCost(weekCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今週のコスト</span>
        <small className="block text-green-600 dark:text-green-400">{formatYen(weekCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.week} exchangeRate={exchangeRate} />
      </div>

      <div className="glass-card rounded-xl p-4 text-center border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20">
        <span className="block text-2xl font-bold text-blue-600 dark:text-blue-400 animate-count-up">{formatCost(monthCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">今月のコスト</span>
        <small className="block text-green-600 dark:text-green-400">{formatYen(monthCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.month} exchangeRate={exchangeRate} />
        {forecast && <TrendBadge forecast={forecast} />}
      </div>

      <div className="glass-card rounded-xl p-4 text-center">
        <span className="block text-2xl font-bold text-gray-900 dark:text-white animate-count-up">{formatCost(lastMonthCost)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">先月のコスト</span>
        <small className="block text-gray-500">{formatYen(lastMonthCost, exchangeRate)}</small>
        <BreakdownLine item={costBreakdown.lastMonth} exchangeRate={exchangeRate} />
      </div>
    </div>
  );
});
