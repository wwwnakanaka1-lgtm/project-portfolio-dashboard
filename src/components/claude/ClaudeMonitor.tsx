"use client";

import { useState, useEffect, useCallback } from "react";
import { SessionList } from "./SessionList";
import { StatsSummary } from "./StatsSummary";
import { RateLimitBar } from "./RateLimitBar";
import { ApiUsageSection } from "./ApiUsageSection";
import { UsageHistoryTab } from "./UsageHistoryTab";
import { ManualTasksTab } from "./ManualTasksTab";
import { SettingsModal } from "./SettingsModal";
import { RateLimitSyncModal } from "./RateLimitSyncModal";
import { TitleEditModal } from "./TitleEditModal";
import { SessionDetailModal } from "./SessionDetailModal";
import { TaskModal } from "./TaskModal";
import { ServerStatus } from "./ServerStatus";
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
  todayCost: number;
  weekCost: number;
  monthCost: number;
  lastMonthCost: number;
  todayMessages: number;
  dailyActivity: DailyActivity[];
  monthlySummary: MonthlySummary[];
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

interface ConfigData {
  hasApiKey: boolean;
  maskedKey: string | null;
  keyType: "admin" | "standard" | "oauth" | "unknown" | null;
  updatedAt?: string;
}

interface RateLimitData {
  usagePercent: number;
  outputTokensLimit: number | null;
  outputTokensRemaining: number | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  resetTimeStr: string;
  source: string;
  fetchedAt: string;
}

interface ApiUsageData {
  today: { tokens: { input: number; output: number }; cost: number };
  month: { tokens: { input: number; output: number }; cost: number };
  source: string;
  fetchedAt: string;
}

interface ManualTask {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

const FALLBACK_RATE = 150;
const REFRESH_INTERVAL = 10000;

export function ClaudeMonitor() {
  // Data states
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(null);
  const [apiUsageData, setApiUsageData] = useState<ApiUsageData | null>(null);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([]);

  // UI states
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"claude" | "history" | "manual">("claude");
  const [serverConnected, setServerConnected] = useState(true);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [showTitleEditModal, setShowTitleEditModal] = useState(false);
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editingTask, setEditingTask] = useState<ManualTask | null>(null);

  // Rate limit sync state (localStorage)
  const [syncedRateLimit, setSyncedRateLimit] = useState<{
    percent: number;
    resetTime: Date;
    syncedAt: Date;
  } | null>(null);

  // Custom titles (localStorage)
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});

  // Load localStorage data
  useEffect(() => {
    const savedTitles = localStorage.getItem("claude-custom-titles");
    if (savedTitles) {
      setCustomTitles(JSON.parse(savedTitles));
    }

    const savedRateLimit = localStorage.getItem("claude-rate-limit-sync");
    if (savedRateLimit) {
      const parsed = JSON.parse(savedRateLimit);
      setSyncedRateLimit({
        percent: parsed.percent,
        resetTime: new Date(parsed.resetTime),
        syncedAt: new Date(parsed.syncedAt),
      });
    }

    const savedTasks = localStorage.getItem("claude-manual-tasks");
    if (savedTasks) {
      setManualTasks(JSON.parse(savedTasks));
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, statsRes, configRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/usage-stats"),
        fetch("/api/config"),
      ]);

      if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
      if (!statsRes.ok) throw new Error("Failed to fetch stats");

      const sessions = await sessionsRes.json();
      const stats = await statsRes.json();
      const config = configRes.ok ? await configRes.json() : null;

      setSessionsData(sessions);
      setStatsData(stats);
      if (config) setConfigData(config);

      setLastRefresh(new Date());
      setError(null);
      setServerConnected(true);

      // Fetch API-based data if key is configured
      if (config?.hasApiKey) {
        try {
          const rateLimitRes = await fetch("/api/anthropic/ratelimit");
          if (rateLimitRes.ok) {
            const rl = await rateLimitRes.json();
            if (!rl.error) setRateLimitData(rl);
          }
        } catch {
          // Ignore rate limit fetch errors
        }

        if (config.keyType === "admin") {
          try {
            const usageRes = await fetch("/api/anthropic/usage");
            if (usageRes.ok) {
              const usage = await usageRes.json();
              if (!usage.error) setApiUsageData(usage);
            }
          } catch {
            // Ignore usage fetch errors
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setServerConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    getExchangeRate().then((result) => {
      setExchangeRate(result.rate);
      setRateSource(result.source);
    });
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData]);

  // Calculate estimated rate limit if no API data
  const getEstimatedRateLimit = () => {
    if (syncedRateLimit) {
      const now = new Date();
      const messagesInPeriod = statsData?.todayMessages || 0;
      const estimatedUsage = syncedRateLimit.percent + (messagesInPeriod * 0.3);

      const resetDiff = syncedRateLimit.resetTime.getTime() - now.getTime();
      const hours = Math.floor(resetDiff / (1000 * 60 * 60));
      const mins = Math.floor((resetDiff % (1000 * 60 * 60)) / (1000 * 60));

      return {
        percent: Math.min(100, Math.round(estimatedUsage)),
        resetStr: resetDiff > 0 ? `${hours}時間${mins}分後にリセット` : "リセット済み",
        isSynced: true,
      };
    }

    return {
      percent: 0,
      resetStr: "--",
      isSynced: false,
    };
  };

  // Handle title edit
  const handleTitleEdit = (sessionId: string, customTitle: string) => {
    const newTitles = { ...customTitles };
    if (customTitle) {
      newTitles[sessionId] = customTitle;
    } else {
      delete newTitles[sessionId];
    }
    setCustomTitles(newTitles);
    localStorage.setItem("claude-custom-titles", JSON.stringify(newTitles));
    setShowTitleEditModal(false);
    setSelectedSession(null);
  };

  // Handle rate limit sync
  const handleRateLimitSync = (percent: number, hours: number, minutes: number) => {
    const resetTime = new Date();
    resetTime.setHours(resetTime.getHours() + hours);
    resetTime.setMinutes(resetTime.getMinutes() + minutes);

    const syncData = {
      percent,
      resetTime: resetTime.toISOString(),
      syncedAt: new Date().toISOString(),
    };

    setSyncedRateLimit({
      percent,
      resetTime,
      syncedAt: new Date(),
    });
    localStorage.setItem("claude-rate-limit-sync", JSON.stringify(syncData));
    setShowRateLimitModal(false);
  };

  // Handle reset rate limit
  const handleResetRateLimit = () => {
    setSyncedRateLimit(null);
    localStorage.removeItem("claude-rate-limit-sync");
    setShowRateLimitModal(false);
  };

  // Handle manual task save
  const handleTaskSave = (task: ManualTask) => {
    let newTasks: ManualTask[];
    if (editingTask) {
      newTasks = manualTasks.map((t) => (t.id === task.id ? task : t));
    } else {
      newTasks = [...manualTasks, task];
    }
    setManualTasks(newTasks);
    localStorage.setItem("claude-manual-tasks", JSON.stringify(newTasks));
    setShowTaskModal(false);
    setEditingTask(null);
  };

  // Handle manual task delete
  const handleTaskDelete = (taskId: string) => {
    const newTasks = manualTasks.filter((t) => t.id !== taskId);
    setManualTasks(newTasks);
    localStorage.setItem("claude-manual-tasks", JSON.stringify(newTasks));
    setShowTaskModal(false);
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const estimatedLimit = getEstimatedRateLimit();

  const internalTabs = [
    { id: "claude" as const, label: "Claude Sessions" },
    { id: "history" as const, label: "使用量履歴" },
    { id: "manual" as const, label: "手動タスク" },
  ];

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>最終更新: {lastRefresh ? lastRefresh.toLocaleTimeString("ja-JP") : "--"}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>自動更新: 10秒</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="設定"
          >
            ⚙️ 設定
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="更新"
          >
            🔄 更新
          </button>
          <button
            onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + タスク追加
          </button>
        </div>
      </div>

      {/* API Usage Section (if admin key) */}
      {configData?.keyType === "admin" && apiUsageData && (
        <ApiUsageSection
          data={apiUsageData}
          rateLimitData={rateLimitData}
          exchangeRate={exchangeRate}
        />
      )}

      {/* Rate Limit Bar */}
      <RateLimitBar
        apiData={rateLimitData}
        estimatedData={estimatedLimit}
        onSyncClick={() => setShowRateLimitModal(true)}
      />

      {/* Stats Summary */}
      {statsData && (
        <StatsSummary
          todayCost={statsData.todayCost}
          weekCost={statsData.weekCost}
          monthCost={statsData.monthCost}
          lastMonthCost={statsData.lastMonthCost}
          todayMessages={statsData.todayMessages}
          exchangeRate={exchangeRate}
          rateSource={rateSource}
        />
      )}

      {/* Internal Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-1 p-1">
            {internalTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {/* Tab Content: Claude Sessions */}
          {activeTab === "claude" && (
            <>
              {error ? (
                <div className="text-red-500 p-4">
                  エラー: {error}
                  <button onClick={fetchData} className="ml-2 text-blue-500 hover:underline">再試行</button>
                </div>
              ) : sessionsData ? (
                <SessionList
                  grouped={sessionsData.grouped}
                  exchangeRate={exchangeRate}
                  customTitles={customTitles}
                  onTitleEdit={(session) => {
                    setSelectedSession(session);
                    setShowTitleEditModal(true);
                  }}
                  onSessionClick={(session) => {
                    setSelectedSession(session);
                    setShowSessionDetailModal(true);
                  }}
                />
              ) : null}
            </>
          )}

          {/* Tab Content: Usage History */}
          {activeTab === "history" && statsData && (
            <UsageHistoryTab
              dailyActivity={statsData.dailyActivity}
              monthlySummary={statsData.monthlySummary}
              exchangeRate={exchangeRate}
            />
          )}

          {/* Tab Content: Manual Tasks */}
          {activeTab === "manual" && (
            <ManualTasksTab
              tasks={manualTasks}
              onTaskClick={(task) => {
                setEditingTask(task);
                setShowTaskModal(true);
              }}
              onStatusChange={(taskId, newStatus) => {
                const newTasks = manualTasks.map((t) =>
                  t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
                );
                setManualTasks(newTasks);
                localStorage.setItem("claude-manual-tasks", JSON.stringify(newTasks));
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showSettingsModal && (
        <SettingsModal
          config={configData}
          onClose={() => setShowSettingsModal(false)}
          onSave={async (apiKey) => {
            try {
              const res = await fetch("/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ anthropicApiKey: apiKey }),
              });
              if (res.ok) {
                const newConfig = await res.json();
                setConfigData(newConfig);
                fetchData();
              }
            } catch (err) {
              console.error("Failed to save config:", err);
            }
            setShowSettingsModal(false);
          }}
          onDelete={async () => {
            try {
              await fetch("/api/config", { method: "DELETE" });
              setConfigData({ hasApiKey: false, maskedKey: null, keyType: null });
              setApiUsageData(null);
              setRateLimitData(null);
            } catch (err) {
              console.error("Failed to delete config:", err);
            }
            setShowSettingsModal(false);
          }}
        />
      )}

      {showRateLimitModal && (
        <RateLimitSyncModal
          onClose={() => setShowRateLimitModal(false)}
          onSync={handleRateLimitSync}
          onReset={handleResetRateLimit}
        />
      )}

      {showTitleEditModal && selectedSession && (
        <TitleEditModal
          session={selectedSession}
          currentTitle={customTitles[selectedSession.id] || ""}
          onClose={() => {
            setShowTitleEditModal(false);
            setSelectedSession(null);
          }}
          onSave={(title) => handleTitleEdit(selectedSession.id, title)}
          onReset={() => handleTitleEdit(selectedSession.id, "")}
        />
      )}

      {showSessionDetailModal && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          customTitle={customTitles[selectedSession.id]}
          exchangeRate={exchangeRate}
          onClose={() => {
            setShowSessionDetailModal(false);
            setSelectedSession(null);
          }}
        />
      )}

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          onSave={handleTaskSave}
          onDelete={editingTask ? () => handleTaskDelete(editingTask.id) : undefined}
        />
      )}

      {/* Server Status */}
      <ServerStatus connected={serverConnected} />
    </div>
  );
}
