"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { CostAnomalyAlert } from "@/components/CostAnomalyAlert";
import { getPricing, normalizeModelName } from "@/lib/usage-types";

interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  cost: number;
}

interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
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

interface UsageData {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  modelUsage: Record<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  monthlySummary: MonthlySummary[];
  lastUpdated: string;
  dataSource: string;
}

type ActivityRange = "14d" | "30d" | "90d" | "all";
const ACTIVITY_RANGES: { key: ActivityRange; label: string }[] = [
  { key: "14d", label: "2週間" },
  { key: "30d", label: "1ヶ月" },
  { key: "90d", label: "3ヶ月" },
  { key: "all", label: "全期間" },
];

export function UsageStats() {
  const { exchangeRate, rateSource } = useExchangeRate();
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityRange, setActivityRange] = useState<ActivityRange>("30d");

  useEffect(() => {
    // Fetch usage data from API
    fetch("/api/usage-stats")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch usage data");
        return res.json();
      })
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatUSD = (value: number) => `$${value.toFixed(2)}`;
  const formatJPY = (value: number) => `¥${Math.round(value * exchangeRate).toLocaleString()}`;
  const formatTokens = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-red-500">エラー: {error || "データを取得できませんでした"}</div>
      </div>
    );
  }

  const sliceCount = activityRange === "14d" ? 14 : activityRange === "30d" ? 30 : activityRange === "90d" ? 90 : data.dailyActivity.length;
  const chartData = data.dailyActivity.slice(-sliceCount).map((d) => ({
    date: d.date.slice(5),
    messages: d.messageCount,
    tools: d.toolCallCount,
  }));

  // Merge model entries by normalized display name to avoid duplicates
  const mergedModels = new Map<string, ModelUsage & { displayName: string }>();
  for (const [model, usage] of Object.entries(data.modelUsage)) {
    if (model === "<synthetic>") continue;
    const displayName = normalizeModelName(model);
    const existing = mergedModels.get(displayName);
    if (existing) {
      existing.inputTokens += usage.inputTokens;
      existing.outputTokens += usage.outputTokens;
      existing.cacheReadTokens += usage.cacheReadTokens;
      existing.cacheCreateTokens += usage.cacheCreateTokens;
      existing.cost += usage.cost;
    } else {
      mergedModels.set(displayName, { ...usage, displayName });
    }
  }
  const modelEntries = [...mergedModels.entries()]
    .sort((a, b) => b[1].cost - a[1].cost);

  return (
    <div className="glass-card rounded-xl p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Claude Code 使用量・コスト
      </h2>

      {/* Cost Anomaly Alerts */}
      {data.dailyActivity && data.dailyActivity.length > 7 && (
        <CostAnomalyAlert
          dailyActivity={data.dailyActivity}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{formatUSD(data.totalCost)}</div>
          <div className="text-lg font-semibold opacity-90">{formatJPY(data.totalCost)}</div>
          <div className="text-sm opacity-75">推定総コスト</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{formatTokens(data.totalTokens)}</div>
          <div className="text-sm opacity-90">総トークン数</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{data.totalSessions}</div>
          <div className="text-sm opacity-90">セッション数</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{data.totalMessages.toLocaleString()}</div>
          <div className="text-sm opacity-90">メッセージ数</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          モデル別コスト内訳
        </h3>
        <div className="space-y-3">
          {modelEntries.map(([displayName, usage]) => {
            const percentage = (usage.cost / data.totalCost) * 100;

            // Calculate individual costs based on token counts and averaged pricing
            const pricing = getPricing(
              displayName.includes("Opus") ? "claude-opus-4-6"
              : displayName.includes("Haiku") ? "claude-haiku-4-5-20251001"
              : "claude-sonnet-4-5-20250929"
            );

            const inputCost = (usage.inputTokens / 1e6) * pricing.input;
            const outputCost = (usage.outputTokens / 1e6) * pricing.output;
            const cacheReadCost = (usage.cacheReadTokens / 1e6) * pricing.cacheRead;
            const cacheCreateCost = (usage.cacheCreateTokens / 1e6) * pricing.cacheCreate;

            return (
              <div key={displayName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 dark:text-white" translate="no">{displayName}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">{formatUSD(usage.cost)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({formatJPY(usage.cost)})</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <div>
                    <div className="font-medium">入力</div>
                    <div>{formatUSD(inputCost)}</div>
                    <div className="text-gray-400">{formatJPY(inputCost)}</div>
                  </div>
                  <div>
                    <div className="font-medium">出力</div>
                    <div>{formatUSD(outputCost)}</div>
                    <div className="text-gray-400">{formatJPY(outputCost)}</div>
                  </div>
                  <div>
                    <div className="font-medium">キャッシュ読取</div>
                    <div>{formatUSD(cacheReadCost)}</div>
                    <div className="text-gray-400">{formatJPY(cacheReadCost)}</div>
                  </div>
                  <div>
                    <div className="font-medium">キャッシュ作成</div>
                    <div>{formatUSD(cacheCreateCost)}</div>
                    <div className="text-gray-400">{formatJPY(cacheCreateCost)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Chart */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            アクティビティ
          </h3>
          <div className="flex gap-1">
            {ACTIVITY_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setActivityRange(r.key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  activityRange === r.key
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className={activityRange === "14d" ? "h-48" : activityRange === "30d" ? "h-56" : "h-64"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={sliceCount <= 14 ? 0 : sliceCount <= 30 ? 1 : sliceCount <= 90 ? 4 : "preserveStartEnd"} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === "messages" ? "Messages" : "Tool Calls",
                ]}
              />
              <Legend
                formatter={(value) => (value === "messages" ? "Messages" : "Tool Calls")}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="messages" fill="#3B82F6" name="messages" radius={[2, 2, 0, 0]} />
              <Bar dataKey="tools" fill="#10B981" name="tools" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Cost Chart */}
      {data.monthlySummary && data.monthlySummary.length > 0 && (() => {
        const last12 = data.monthlySummary.slice(-12);
        const maxCost = Math.max(...last12.map((m) => m.cost), 1);
        return (
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            月別コスト推移
          </h3>
          <div className="flex items-end justify-around gap-2 h-56">
            {last12.map((month) => {
              const height = Math.max(10, (month.cost / maxCost) * 180);
              const [, mm] = month.month.split("-");
              return (
                <div key={month.month} className="flex flex-col items-center">
                  <div
                    className="w-10 bg-gradient-to-t from-green-600 to-green-400 rounded-t-md transition-all duration-300 relative group cursor-pointer hover:from-green-500 hover:to-green-300"
                    style={{ height: `${height}px` }}
                    title={`${month.month}: $${month.cost.toFixed(2)} (¥${Math.round(month.cost * exchangeRate).toLocaleString()})`}
                  >
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      ${month.cost.toFixed(0)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{parseInt(mm)}月</span>
                  <span className="text-xs text-green-600 dark:text-green-400">¥{Math.round(month.cost * exchangeRate).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        データソース: JSONL直接読み取り | 最終更新: {new Date(data.lastUpdated).toLocaleDateString("ja-JP")} | 為替レート: $1 = ¥{exchangeRate}
        {rateSource === "api" ? " (自動取得)" : " (フォールバック)"}
      </div>
    </div>
  );
}
