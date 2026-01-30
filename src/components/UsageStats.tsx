"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getExchangeRate } from "@/lib/exchange-rate";

const FALLBACK_RATE = 150;

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
}

interface UsageData {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  modelUsage: Record<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  lastUpdated: string;
  dataSource: string;
}

export function UsageStats() {
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch exchange rate
    getExchangeRate().then((result) => {
      setExchangeRate(result.rate);
      setRateSource(result.source);
    });

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

  const chartData = data.dailyActivity.slice(-14).map((d) => ({
    date: d.date.slice(5),
    messages: d.messageCount,
    tools: d.toolCallCount,
  }));

  const modelEntries = Object.entries(data.modelUsage).sort((a, b) => b[1].cost - a[1].cost);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Claude Code 使用量・コスト
      </h2>

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
          {modelEntries.map(([model, usage]) => {
            const modelName = model.includes("opus") ? "Opus 4.5" : "Sonnet 4.5";
            const percentage = (usage.cost / data.totalCost) * 100;

            // Calculate individual costs
            const pricing = model.includes("opus")
              ? { input: 15, output: 75, cacheRead: 1.5, cacheCreate: 18.75 }
              : { input: 3, output: 15, cacheRead: 0.3, cacheCreate: 3.75 };

            const inputCost = (usage.inputTokens / 1e6) * pricing.input;
            const outputCost = (usage.outputTokens / 1e6) * pricing.output;
            const cacheReadCost = (usage.cacheReadTokens / 1e6) * pricing.cacheRead;
            const cacheCreateCost = (usage.cacheCreateTokens / 1e6) * pricing.cacheCreate;

            return (
              <div key={model} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{modelName}</span>
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
        データソース: JSONL直接読み取り | 最終更新: {new Date(data.lastUpdated).toLocaleDateString("ja-JP")} | 為替レート: $1 = ¥{exchangeRate}
        {rateSource === "api" ? " (自動取得)" : " (フォールバック)"}
      </div>
    </div>
  );
}
