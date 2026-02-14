"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SessionCard } from "./SessionList";
import { StatsSummary } from "./StatsSummary";
import { RateLimitBar } from "./RateLimitBar";
import { ApiUsageSection } from "./ApiUsageSection";
import { UsageHistoryTab } from "./UsageHistoryTab";
import { ManualTasksTab } from "./ManualTasksTab";
import { SettingsModal } from "./SettingsModal";
import { TitleEditModal } from "./TitleEditModal";
import { SessionDetailModal } from "./SessionDetailModal";
import { TaskModal } from "./TaskModal";
import { ServerStatus } from "./ServerStatus";
import { getExchangeRate } from "@/lib/exchange-rate";
import {
  CodexMonitor,
  CodexSessionCard,
  type CodexSession,
  type CodexSessionsData,
} from "@/components/codex/CodexMonitor";

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

interface ProviderPlanUsage {
  provider: "claude" | "codex";
  planName: string;
  monthlyPriceUsd: number;
  limitMessages: number;
  usedMessages: number;
  usagePercent: number;
}

interface PlanUsageData {
  windowHours: number;
  windowStart: string;
  windowEnd: string;
  resetTimeStr: string;
  claude: ProviderPlanUsage;
  codex: ProviderPlanUsage;
  source: string;
  generatedAt: string;
}

interface ManualTask {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface TitleTarget {
  provider: "claude" | "codex";
  id: string;
  name: string;
}

type SessionBucket = "active" | "recent" | "past";
type UnifiedSession =
  | { provider: "claude"; session: Session }
  | { provider: "codex"; session: CodexSession };

interface PeriodCost {
  todayCost: number;
  weekCost: number;
  monthCost: number;
  lastMonthCost: number;
  todayMessages: number;
}

const FALLBACK_RATE = 150;
const REFRESH_INTERVAL = 10000;
const CUSTOM_TITLES_STORAGE_KEY = "claude-custom-titles";
const CUSTOM_TITLES_UPDATED_EVENT = "claude-custom-titles-updated";

export function ClaudeMonitor() {
  // Data states
  const [sessionsData, setSessionsData] = useState<SessionsData | null>(null);
  const [codexData, setCodexData] = useState<CodexSessionsData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(null);
  const [apiUsageData, setApiUsageData] = useState<ApiUsageData | null>(null);
  const [planUsageData, setPlanUsageData] = useState<PlanUsageData | null>(null);
  const [manualTasks, setManualTasks] = useState<ManualTask[]>([]);

  // UI states
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codexError, setCodexError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<"claude" | "codex" | "history" | "manual">("claude");
  const [serverConnected, setServerConnected] = useState(true);
  const [pastCollapsed, setPastCollapsed] = useState(true);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTitleEditModal, setShowTitleEditModal] = useState(false);
  const [showSessionDetailModal, setShowSessionDetailModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [selectedTitleTarget, setSelectedTitleTarget] = useState<TitleTarget | null>(null);
  const [editingTask, setEditingTask] = useState<ManualTask | null>(null);

  // Custom titles (localStorage)
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});

  // Load localStorage data
  useEffect(() => {
    const savedTitles = localStorage.getItem(CUSTOM_TITLES_STORAGE_KEY);
    if (savedTitles) {
      try {
        setCustomTitles(JSON.parse(savedTitles));
      } catch {
        setCustomTitles({});
      }
    }

    const savedTasks = localStorage.getItem("claude-manual-tasks");
    if (savedTasks) {
      setManualTasks(JSON.parse(savedTasks));
    }
  }, []);

  useEffect(() => {
    const refreshCustomTitles = () => {
      const savedTitles = localStorage.getItem(CUSTOM_TITLES_STORAGE_KEY);
      if (!savedTitles) {
        setCustomTitles({});
        return;
      }
      try {
        setCustomTitles(JSON.parse(savedTitles));
      } catch {
        setCustomTitles({});
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === CUSTOM_TITLES_STORAGE_KEY) {
        refreshCustomTitles();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(CUSTOM_TITLES_UPDATED_EVENT, refreshCustomTitles);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(CUSTOM_TITLES_UPDATED_EVENT, refreshCustomTitles);
    };
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [sessionsRes, statsRes, configRes, codexRes, planUsageRes] = await Promise.all([
        fetch("/api/sessions"),
        fetch("/api/usage-stats"),
        fetch("/api/config"),
        fetch("/api/codex-sessions"),
        fetch("/api/plan-usage"),
      ]);

      if (!sessionsRes.ok) throw new Error("Failed to fetch sessions");
      if (!statsRes.ok) throw new Error("Failed to fetch stats");

      const sessions = await sessionsRes.json();
      const stats = await statsRes.json();
      const config = configRes.ok ? await configRes.json() : null;
      if (codexRes.ok) {
        const codex = (await codexRes.json()) as CodexSessionsData;
        setCodexData(codex);
        setCodexError(null);
      } else {
        setCodexData(null);
        setCodexError("Failed to fetch Codex sessions");
      }

      if (planUsageRes.ok) {
        const planUsage = (await planUsageRes.json()) as PlanUsageData;
        setPlanUsageData(planUsage);
      } else {
        setPlanUsageData(null);
      }

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
      } else {
        setRateLimitData(null);
        setApiUsageData(null);
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

  const getTitleKey = (provider: "claude" | "codex", sessionId: string) => `${provider}:${sessionId}`;

  const getDisplayTitle = (provider: "claude" | "codex", sessionId: string) => {
    const namespaced = customTitles[getTitleKey(provider, sessionId)];
    if (namespaced) {
      return namespaced;
    }
    // Backward compatibility for old Claude-only key format
    if (provider === "claude") {
      return customTitles[sessionId];
    }
    return undefined;
  };

  // Handle title edit
  const handleTitleEdit = (provider: "claude" | "codex", sessionId: string, customTitle: string) => {
    const newTitles = { ...customTitles };
    const key = getTitleKey(provider, sessionId);
    if (customTitle) {
      newTitles[key] = customTitle;
    } else {
      delete newTitles[key];
      if (provider === "claude") {
        delete newTitles[sessionId];
      }
    }
    setCustomTitles(newTitles);
    localStorage.setItem(CUSTOM_TITLES_STORAGE_KEY, JSON.stringify(newTitles));
    window.dispatchEvent(new Event(CUSTOM_TITLES_UPDATED_EVENT));
    setShowTitleEditModal(false);
    setSelectedTitleTarget(null);
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

  const buildUnifiedSessions = (bucket: SessionBucket): UnifiedSession[] => {
    const claudeSessions = sessionsData?.grouped[bucket] ?? [];
    const codexSessions = codexData?.grouped[bucket] ?? [];

    return [
      ...claudeSessions.map((session) => ({ provider: "claude" as const, session })),
      ...codexSessions.map((session) => ({ provider: "codex" as const, session })),
    ].sort((a, b) => a.session.minutesAgo - b.session.minutesAgo);
  };

  const activeSessions = buildUnifiedSessions("active");
  const recentSessions = buildUnifiedSessions("recent");
  const pastSessions = buildUnifiedSessions("past");

  const codexPeriod = useMemo<PeriodCost>(() => {
    const empty: PeriodCost = {
      todayCost: 0,
      weekCost: 0,
      monthCost: 0,
      lastMonthCost: 0,
      todayMessages: 0,
    };
    if (!codexData) {
      return empty;
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let todayCost = 0;
    let weekCost = 0;
    let monthCost = 0;
    let lastMonthCost = 0;
    let todayMessages = 0;

    for (const session of codexData.sessions) {
      const modified = new Date(session.modified);
      if (Number.isNaN(modified.getTime())) {
        continue;
      }

      const sessionDate = modified.toISOString().split("T")[0];
      const sessionCost = session.estimatedCostUsd || 0;
      const sessionMessages = session.userMessageCount + session.agentMessageCount;

      if (sessionDate === todayStr) {
        todayCost += sessionCost;
        todayMessages += sessionMessages;
      }
      if (sessionDate >= weekStartStr) {
        weekCost += sessionCost;
      }
      if (sessionDate >= monthStartStr) {
        monthCost += sessionCost;
      }
      if (sessionDate.startsWith(lastMonthKey)) {
        lastMonthCost += sessionCost;
      }
    }

    return {
      todayCost,
      weekCost,
      monthCost,
      lastMonthCost,
      todayMessages,
    };
  }, [codexData]);

  const mergedSummary = useMemo(() => {
    if (!statsData) {
      return null;
    }

    const claudeCosts = {
      today: statsData.todayCost,
      week: statsData.weekCost,
      month: statsData.monthCost,
      lastMonth: statsData.lastMonthCost,
    };

    const codexCosts = {
      today: codexPeriod.todayCost,
      week: codexPeriod.weekCost,
      month: codexPeriod.monthCost,
      lastMonth: codexPeriod.lastMonthCost,
    };

    return {
      todayCost: claudeCosts.today + codexCosts.today,
      weekCost: claudeCosts.week + codexCosts.week,
      monthCost: claudeCosts.month + codexCosts.month,
      lastMonthCost: claudeCosts.lastMonth + codexCosts.lastMonth,
      todayMessages: statsData.todayMessages + codexPeriod.todayMessages,
      costBreakdown: {
        today: { claude: claudeCosts.today, codex: codexCosts.today },
        week: { claude: claudeCosts.week, codex: codexCosts.week },
        month: { claude: claudeCosts.month, codex: codexCosts.month },
        lastMonth: { claude: claudeCosts.lastMonth, codex: codexCosts.lastMonth },
      },
      messageBreakdown: {
        claude: statsData.todayMessages,
        codex: codexPeriod.todayMessages,
      },
    };
  }, [codexPeriod, statsData]);

  const mergedUsageHistory = useMemo(() => {
    const dailyMap = new Map<string, DailyActivity>();

    for (const day of statsData?.dailyActivity ?? []) {
      const input = day.tokens.inputTokens || 0;
      const output = day.tokens.outputTokens || 0;
      const cacheRead = day.tokens.cacheReadTokens || 0;
      const cacheCreate = day.tokens.cacheCreationTokens || 0;

      dailyMap.set(day.date, {
        ...day,
        tokens: {
          inputTokens: input,
          outputTokens: output,
          cacheReadTokens: cacheRead,
          cacheCreationTokens: cacheCreate,
          totalTokens: input + output + cacheRead + cacheCreate,
        },
      });
    }

    if (codexData) {
      for (const session of codexData.sessions) {
        const modified = new Date(session.modified);
        if (Number.isNaN(modified.getTime())) {
          continue;
        }

        const date = modified.toISOString().split("T")[0];
        const current = dailyMap.get(date) ?? {
          date,
          messageCount: 0,
          sessionCount: 0,
          toolCallCount: 0,
          tokens: {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
            totalTokens: 0,
          },
          cost: 0,
        };

        const rawInput = session.tokenUsage?.inputTokens ?? 0;
        const cacheRead = session.tokenUsage?.cachedInputTokens ?? 0;
        const input = Math.max(0, rawInput - cacheRead);
        const output = session.tokenUsage?.outputTokens ?? 0;
        const messageCount = session.userMessageCount + session.agentMessageCount;

        current.messageCount += messageCount;
        current.sessionCount += 1;
        current.toolCallCount += session.toolCallCount;
        current.tokens.inputTokens += input;
        current.tokens.outputTokens += output;
        current.tokens.cacheReadTokens += cacheRead;
        current.tokens.totalTokens += input + output + cacheRead;
        current.cost += session.estimatedCostUsd || 0;

        dailyMap.set(date, current);
      }
    }

    const dailyActivity = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const monthlyMap = new Map<string, MonthlySummary>();
    for (const day of dailyActivity) {
      const monthKey = day.date.slice(0, 7);
      const current = monthlyMap.get(monthKey) ?? {
        month: monthKey,
        cost: 0,
        days: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheCreateTokens: 0,
      };

      current.cost += day.cost;
      current.days += 1;
      current.inputTokens += day.tokens.inputTokens;
      current.outputTokens += day.tokens.outputTokens;
      current.cacheReadTokens += day.tokens.cacheReadTokens;
      current.cacheCreateTokens += day.tokens.cacheCreationTokens;

      monthlyMap.set(monthKey, current);
    }

    const monthlySummary = Array.from(monthlyMap.values())
      .map((month) => ({
        ...month,
        cost: Math.round(month.cost * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      dailyActivity,
      monthlySummary,
    };
  }, [codexData, statsData]);

  const renderUnifiedCard = (item: UnifiedSession) => {
    const isClaude = item.provider === "claude";
    return (
      <div key={`${item.provider}-${item.session.id}`} className="space-y-1">
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
            isClaude
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          }`}
        >
          {isClaude ? "Claude" : "Codex"}
        </span>
        {isClaude ? (
          <SessionCard
            session={item.session}
            exchangeRate={exchangeRate}
            customTitle={getDisplayTitle("claude", item.session.id)}
            onTitleEdit={() => {
              setSelectedTitleTarget({
                provider: "claude",
                id: item.session.id,
                name: item.session.name,
              });
              setShowTitleEditModal(true);
            }}
            onClick={() => {
              setSelectedSession(item.session);
              setShowSessionDetailModal(true);
            }}
          />
        ) : (
          <CodexSessionCard
            session={item.session}
            exchangeRate={exchangeRate}
            customTitle={getDisplayTitle("codex", item.session.id)}
            onTitleEdit={() => {
              setSelectedTitleTarget({
                provider: "codex",
                id: item.session.id,
                name: item.session.name,
              });
              setShowTitleEditModal(true);
            }}
          />
        )}
      </div>
    );
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

  const internalTabs = [
    { id: "claude" as const, label: "All Sessions" },
    { id: "codex" as const, label: "Codex Sessions" },
    { id: "history" as const, label: "Usage History" },
    { id: "manual" as const, label: "Manual Tasks" },
  ];

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString("ja-JP") : "--"}</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span>Auto refresh: 10s</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            Settings
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            Refresh
          </button>
          <button
            onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
            className="px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            + Add Task
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
        planData={planUsageData}
        apiData={rateLimitData}
      />

      {/* Stats Summary */}
      {mergedSummary && (
        <StatsSummary
          todayCost={mergedSummary.todayCost}
          weekCost={mergedSummary.weekCost}
          monthCost={mergedSummary.monthCost}
          lastMonthCost={mergedSummary.lastMonthCost}
          todayMessages={mergedSummary.todayMessages}
          exchangeRate={exchangeRate}
          rateSource={rateSource}
          costBreakdown={mergedSummary.costBreakdown}
          messageBreakdown={mergedSummary.messageBreakdown}
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
                  Error: {error}
                  <button onClick={fetchData} className="ml-2 text-blue-500 hover:underline">Retry</button>
                </div>
              ) : sessionsData ? (
                <div className="space-y-6">
                  {codexError && (
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                      Codex sessions load warning: {codexError}
                    </div>
                  )}

                  <section>
                    <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Active (5 min)
                      <span className="text-sm font-normal text-gray-500">({activeSessions.length})</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Claude {sessionsData.grouped.active.length} / Codex {codexData?.grouped.active.length ?? 0}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activeSessions.map(renderUnifiedCard)}
                      {activeSessions.length === 0 && (
                        <div className="p-4 text-gray-500 dark:text-gray-400">No active sessions</div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                      Recent (1 hour)
                      <span className="text-sm font-normal text-gray-500">({recentSessions.length})</span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Claude {sessionsData.grouped.recent.length} / Codex {codexData?.grouped.recent.length ?? 0}
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {recentSessions.map(renderUnifiedCard)}
                      {recentSessions.length === 0 && (
                        <div className="p-4 text-gray-500 dark:text-gray-400">No recent sessions</div>
                      )}
                    </div>
                  </section>

                  <section>
                    <button
                      type="button"
                      className="mb-1 flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-blue-600 dark:text-white"
                      onClick={() => setPastCollapsed(!pastCollapsed)}
                    >
                      <span className={`transform transition-transform ${pastCollapsed ? "" : "rotate-90"}`}>{">"}</span>
                      Past Sessions
                      <span className="text-sm font-normal text-gray-500">({pastSessions.length})</span>
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Claude {sessionsData.grouped.past.length} / Codex {codexData?.grouped.past.length ?? 0}
                    </p>
                    {!pastCollapsed && (
                      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pastSessions.map(renderUnifiedCard)}
                        {pastSessions.length === 0 && (
                          <div className="p-4 text-gray-500 dark:text-gray-400">No past sessions</div>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              ) : null}
            </>
          )}

          {/* Tab Content: Codex Sessions */}
          {activeTab === "codex" && <CodexMonitor />}

          {/* Tab Content: Usage History */}
          {activeTab === "history" && mergedUsageHistory && (
            <UsageHistoryTab
              dailyActivity={mergedUsageHistory.dailyActivity}
              monthlySummary={mergedUsageHistory.monthlySummary}
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

      {showTitleEditModal && selectedTitleTarget && (
        <TitleEditModal
          session={{
            id: selectedTitleTarget.id,
            name: selectedTitleTarget.name,
            messageCount: 0,
            created: "",
            modified: "",
            status: "past",
            minutesAgo: 0,
          }}
          currentTitle={getDisplayTitle(selectedTitleTarget.provider, selectedTitleTarget.id) || ""}
          onClose={() => {
            setShowTitleEditModal(false);
            setSelectedTitleTarget(null);
          }}
          onSave={(title) => handleTitleEdit(selectedTitleTarget.provider, selectedTitleTarget.id, title)}
          onReset={() => handleTitleEdit(selectedTitleTarget.provider, selectedTitleTarget.id, "")}
        />
      )}

      {showSessionDetailModal && selectedSession && (
        <SessionDetailModal
          session={selectedSession}
          customTitle={getDisplayTitle("claude", selectedSession.id)}
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

