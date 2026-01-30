"use client";

import { useState, useEffect, useCallback } from "react";
import { SessionList } from "./SessionList";
import { StatsSummary } from "./StatsSummary";
import { getExchangeRate } from "@/lib/exchange-rate";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

interface Session {
  id: string;
  name: string;
  messageCount: number;
  created: string;
  modified: string;
  projectPath?: string;
  status: "active" | "recent" | "past";
  minutesAgo: number;
  tokenUsage: TokenUsage | null;
  estimatedCost: number;
  isUnindexed?: boolean;
}

interface GroupedSessions {
  active: Session[];
  recent: Session[];
  past: Session[];
}

interface SessionsData {
  sessions: Session[];
  grouped: GroupedSessions;
  summary: {
    totalSessions: number;
    activeSessions: number;
    recentSessions: number;
    totalCost: number;
    totalMessages: number;
  };
  lastUpdated: string;
}

interface StatsData {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  todayCost?: number;
  weekCost?: number;
  monthCost?: number;
  lastMonthCost?: number;
  todayMessages?: number;
}

const FALLBACK_RATE = 150;
const REFRESH_INTERVAL = 10000; // 10 seconds

export function ClaudeMonitor() {
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/usage-stats"),
      ]);

      if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
      if (!statsRes.ok) throw new Error("Failed to fetch stats");

      const sessions = await sessionsRes.json();
      const stats = await statsRes.json();

      setSessionsData(sessions);

      // Use pre-calculated values from API
      setStatsData({
        totalCost: stats.totalCost || 0,
        totalTokens: stats.totalTokens || 0,
        totalSessions: stats.totalSessions || 0,
        totalMessages: stats.totalMessages || 0,
        todayCost: stats.todayCost || 0,
        weekCost: stats.weekCost || 0,
        monthCost: stats.monthCost || 0,
        lastMonthCost: stats.lastMonthCost || 0,
        todayMessages: stats.todayMessages || 0,
      });

      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    // Fetch exchange rate
    getExchangeRate().then((result) => {
      setExchangeRate(result.rate);
      setRateSource(result.source);
    });

    // Fetch data
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && autoRefresh) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <span>❌</span>
          <span>エラー: {error}</span>
        </div>
        <button
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-red-100 dark:bg-red-900/50 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Claude Monitor
        </h1>
        <div className="flex items-center gap-3">
          {/* Auto refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            自動更新
          </label>

          {/* Refresh button */}
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="更新"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Last updated */}
          {lastRefresh && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              最終更新: {lastRefresh.toLocaleTimeString("ja-JP")}
            </span>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {statsData && (
        <StatsSummary
          todayCost={statsData.todayCost || 0}
          weekCost={statsData.weekCost || 0}
          monthCost={statsData.monthCost || 0}
          lastMonthCost={statsData.lastMonthCost || 0}
          todayMessages={statsData.todayMessages || 0}
          exchangeRate={exchangeRate}
          rateSource={rateSource}
        />
      )}

      {/* Session list */}
      {sessionsData && (
        <SessionList
          grouped={sessionsData.grouped}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Summary footer */}
      {sessionsData && (
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-between px-2">
          <span>
            {sessionsData.summary.totalSessions} セッション
            {sessionsData.summary.activeSessions > 0 && (
              <span className="text-green-500 ml-2">
                ({sessionsData.summary.activeSessions} アクティブ)
              </span>
            )}
          </span>
          <span>
            総メッセージ: {sessionsData.summary.totalMessages.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}
