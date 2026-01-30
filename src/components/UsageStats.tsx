"use client";

import { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  ClaudeUsageStats,
  MODEL_PRICING,
  CostBreakdown,
  UsageSummary,
} from "@/lib/usage-types";
import { getExchangeRate } from "@/lib/exchange-rate";

// Fallback rate if API fetch hasn't completed yet
const FALLBACK_RATE = 150;

// Embedded stats data - in production, this would be loaded dynamically
const USAGE_STATS: ClaudeUsageStats = {
  version: 1,
  lastComputedDate: "2026-01-28",
  dailyActivity: [
    { date: "2025-12-23", messageCount: 477, sessionCount: 2, toolCallCount: 162 },
    { date: "2025-12-26", messageCount: 2085, sessionCount: 2, toolCallCount: 547 },
    { date: "2025-12-27", messageCount: 2012, sessionCount: 3, toolCallCount: 534 },
    { date: "2025-12-28", messageCount: 467, sessionCount: 1, toolCallCount: 122 },
    { date: "2025-12-30", messageCount: 387, sessionCount: 1, toolCallCount: 57 },
    { date: "2026-01-02", messageCount: 909, sessionCount: 1, toolCallCount: 259 },
    { date: "2026-01-03", messageCount: 708, sessionCount: 3, toolCallCount: 192 },
    { date: "2026-01-17", messageCount: 1085, sessionCount: 2, toolCallCount: 299 },
    { date: "2026-01-18", messageCount: 1277, sessionCount: 5, toolCallCount: 334 },
    { date: "2026-01-19", messageCount: 1647, sessionCount: 7, toolCallCount: 371 },
    { date: "2026-01-22", messageCount: 147, sessionCount: 1, toolCallCount: 42 },
    { date: "2026-01-23", messageCount: 560, sessionCount: 1, toolCallCount: 91 },
    { date: "2026-01-24", messageCount: 1473, sessionCount: 1, toolCallCount: 70 },
    { date: "2026-01-25", messageCount: 7235, sessionCount: 4, toolCallCount: 950 },
  ],
  dailyModelTokens: [],
  modelUsage: {
    "claude-sonnet-4-5-20250929": {
      inputTokens: 507,
      outputTokens: 145844,
      cacheReadInputTokens: 20862949,
      cacheCreationInputTokens: 605503,
      webSearchRequests: 0,
      costUSD: 0,
      contextWindow: 0,
    },
    "claude-opus-4-5-20251101": {
      inputTokens: 306829,
      outputTokens: 1830527,
      cacheReadInputTokens: 784293857,
      cacheCreationInputTokens: 57398946,
      webSearchRequests: 0,
      costUSD: 0,
      contextWindow: 0,
    },
  },
  totalSessions: 34,
  totalMessages: 20469,
  longestSession: {
    sessionId: "1baa2f6e-f54e-4c3e-af6d-f9cbf9ee1de2",
    duration: 163391913,
    messageCount: 206,
    timestamp: "2026-01-19T14:10:30.598Z",
  },
  firstSessionDate: "2025-12-23T16:04:16.013Z",
  hourCounts: {},
};

function calculateCost(model: string, usage: ClaudeUsageStats["modelUsage"][string]): CostBreakdown {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["claude-opus-4-5-20251101"];

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;
  const cacheReadCost = (usage.cacheReadInputTokens / 1_000_000) * pricing.cacheRead;
  const cacheCreationCost = (usage.cacheCreationInputTokens / 1_000_000) * pricing.cacheCreation;

  const totalCost = inputCost + outputCost + cacheReadCost + cacheCreationCost;
  const totalTokens = usage.inputTokens + usage.outputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens;

  return {
    model,
    inputCost,
    outputCost,
    cacheReadCost,
    cacheCreationCost,
    totalCost,
    totalTokens,
  };
}

export function UsageStats() {
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    getExchangeRate().then((result) => {
      setExchangeRate(result.rate);
      setRateSource(result.source);
    });
  }, []);

  const summary: UsageSummary = useMemo(() => {
    const costByModel: CostBreakdown[] = Object.entries(USAGE_STATS.modelUsage).map(
      ([model, usage]) => calculateCost(model, usage)
    );

    const totalCost = costByModel.reduce((sum, c) => sum + c.totalCost, 0);
    const totalTokens = costByModel.reduce((sum, c) => sum + c.totalTokens, 0);

    return {
      totalCost,
      totalTokens,
      totalSessions: USAGE_STATS.totalSessions,
      totalMessages: USAGE_STATS.totalMessages,
      costByModel,
      dailyActivity: USAGE_STATS.dailyActivity.slice(-14), // Last 14 days
      recentDays: 14,
    };
  }, []);

  const formatUSD = (value: number) => `$${value.toFixed(2)}`;
  const formatJPY = (value: number) => `¥${Math.round(value * exchangeRate).toLocaleString()}`;
  const formatBoth = (value: number) => `$${value.toFixed(2)} (¥${Math.round(value * exchangeRate).toLocaleString()})`;
  const formatTokens = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toString();
  };

  const chartData = summary.dailyActivity.map((d) => ({
    date: d.date.slice(5), // MM-DD format
    messages: d.messageCount,
    tools: d.toolCallCount,
  }));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Claude Code 使用量・コスト
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{formatUSD(summary.totalCost)}</div>
          <div className="text-lg font-semibold opacity-90">{formatJPY(summary.totalCost)}</div>
          <div className="text-sm opacity-75">推定総コスト</div>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{formatTokens(summary.totalTokens)}</div>
          <div className="text-sm opacity-90">総トークン数</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{summary.totalSessions}</div>
          <div className="text-sm opacity-90">セッション数</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <div className="text-2xl font-bold">{summary.totalMessages.toLocaleString()}</div>
          <div className="text-sm opacity-90">メッセージ数</div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          モデル別コスト内訳
        </h3>
        <div className="space-y-3">
          {summary.costByModel.map((cost) => {
            const modelName = cost.model.includes("opus") ? "Opus 4.5" : "Sonnet 4.5";
            const percentage = (cost.totalCost / summary.totalCost) * 100;
            return (
              <div key={cost.model} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{modelName}</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">{formatUSD(cost.totalCost)}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({formatJPY(cost.totalCost)})</span>
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
                    <div>{formatUSD(cost.inputCost)}</div>
                    <div className="text-gray-400">{formatJPY(cost.inputCost)}</div>
                  </div>
                  <div>
                    <div className="font-medium">出力</div>
                    <div>{formatUSD(cost.outputCost)}</div>
                    <div className="text-gray-400">{formatJPY(cost.outputCost)}</div>
                  </div>
                  <div>
                    <div className="font-medium">キャッシュ読取</div>
                    <div>{formatUSD(cost.cacheReadCost)}</div>
                    <div className="text-gray-400">{formatJPY(cost.cacheReadCost)}</div>
                  </div>
                  <div>
                    <div className="font-medium">キャッシュ作成</div>
                    <div>{formatUSD(cost.cacheCreationCost)}</div>
                    <div className="text-gray-400">{formatJPY(cost.cacheCreationCost)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Chart */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
          最近のアクティビティ
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === "messages" ? "メッセージ" : "ツール呼出",
                ]}
              />
              <Bar dataKey="messages" fill="#3B82F6" name="messages" />
              <Bar dataKey="tools" fill="#10B981" name="tools" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        データソース: ~/.claude/stats-cache.json | 最終更新: {USAGE_STATS.lastComputedDate} | 為替レート: $1 = ¥{exchangeRate}
        {rateSource === "api" ? " (自動取得)" : " (フォールバック)"}
      </div>
    </div>
  );
}
