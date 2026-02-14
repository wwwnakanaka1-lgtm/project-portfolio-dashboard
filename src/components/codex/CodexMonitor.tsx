"use client";

import { useCallback, useEffect, useState } from "react";
import { getExchangeRate } from "@/lib/exchange-rate";
import { TitleEditModal } from "@/components/claude/TitleEditModal";

export type SessionStatus = "active" | "recent" | "past";
type PlanStepStatus = "pending" | "in_progress" | "completed" | "unknown";

interface PricingPerMillion {
  input: number;
  output: number;
  cachedInput: number;
}

interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
}

interface PlanStep {
  step: string;
  status: PlanStepStatus;
}

interface PlanProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  percent: number;
  lastUpdated: string;
  steps: PlanStep[];
}

export interface CodexSession {
  id: string;
  name: string;
  created: string;
  modified: string;
  status: SessionStatus;
  minutesAgo: number;
  cwd: string;
  source: string;
  cliVersion: string;
  model: string;
  modelProvider: string;
  userMessageCount: number;
  agentMessageCount: number;
  toolCallCount: number;
  reasoningCount: number;
  lastUserMessage: string;
  lastAgentMessage: string;
  tokenUsage: TokenUsage | null;
  estimatedCostUsd: number;
  pricing: PricingPerMillion;
  progress: PlanProgress | null;
}

export interface CodexSessionsData {
  sessions: CodexSession[];
  grouped: {
    active: CodexSession[];
    recent: CodexSession[];
    past: CodexSession[];
  };
  summary: {
    totalSessions: number;
    activeSessions: number;
    recentSessions: number;
    totalToolCalls: number;
    totalMessages: number;
    totalInputTokens: number;
    totalCachedInputTokens: number;
    totalOutputTokens: number;
    totalReasoningTokens: number;
    totalTokens: number;
    totalEstimatedCostUsd: number;
    sessionsWithPlan: number;
    pricingDefaults: PricingPerMillion;
  };
  lastUpdated: string;
}

const REFRESH_INTERVAL = 10000;
const FALLBACK_RATE = 150;
const CUSTOM_TITLES_STORAGE_KEY = "claude-custom-titles";
const CUSTOM_TITLES_UPDATED_EVENT = "claude-custom-titles-updated";

function formatRelativeTime(minutesAgo: number): string {
  if (minutesAgo < 1) return "たった今";
  if (minutesAgo < 60) return `${Math.round(minutesAgo)}分前`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}

function formatJpy(value: number, exchangeRate: number): string {
  return `￥${Math.round(value * exchangeRate).toLocaleString()}`;
}

function getTimeClass(status: SessionStatus): string {
  if (status === "active") return "text-green-500 animate-pulse";
  if (status === "recent") return "text-blue-500";
  return "text-gray-500";
}

function getCardClass(status: SessionStatus): string {
  if (status === "active") return "border-green-500 bg-green-50 dark:bg-green-900/20";
  if (status === "recent") return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
  return "border-gray-200 dark:border-gray-700";
}

function getPlanItemClass(status: PlanStepStatus): string {
  if (status === "completed") return "text-green-600 dark:text-green-400 line-through";
  if (status === "in_progress") return "text-blue-600 dark:text-blue-400";
  return "text-gray-600 dark:text-gray-400";
}

function getPlanItemIcon(status: PlanStepStatus): string {
  if (status === "completed") return "✓";
  if (status === "in_progress") return "↻";
  return "⌛";
}

export function CodexSessionCard({
  session,
  exchangeRate,
  customTitle,
  onTitleEdit,
}: {
  session: CodexSession;
  exchangeRate: number;
  customTitle?: string;
  onTitleEdit?: () => void;
}) {
  const totalMessages = session.userMessageCount + session.agentMessageCount;
  const usagePercent = Math.min(100, (session.estimatedCostUsd / 5) * 100);
  const usageColor =
    usagePercent >= 80 ? "bg-red-500" : usagePercent >= 50 ? "bg-yellow-500" : "bg-blue-500";
  const usageTextColor =
    usagePercent >= 80 ? "text-red-500" : usagePercent >= 50 ? "text-yellow-500" : "text-blue-500";
  const nonCachedInputTokens = session.tokenUsage
    ? Math.max(0, session.tokenUsage.inputTokens - session.tokenUsage.cachedInputTokens)
    : 0;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border ${getCardClass(session.status)} p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="font-medium text-gray-900 dark:text-white truncate">{customTitle || session.name}</span>
          {onTitleEdit && (
            <button
              type="button"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-xs flex-shrink-0"
              onClick={onTitleEdit}
              title="タイトルを編集"
            >
              ✎
            </button>
          )}
        </div>
        <span className={`text-sm flex-shrink-0 ${getTimeClass(session.status)}`}>
          {formatRelativeTime(session.minutesAgo)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span>💬 {totalMessages}</span>
        {session.tokenUsage && <span>🔤 {formatTokens(session.tokenUsage.totalTokens)}</span>}
      </div>

      {session.tokenUsage && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">トークン使用量</span>
            <span className="text-xs text-green-600 dark:text-green-400">
              {formatUsd(session.estimatedCostUsd)} ({formatJpy(session.estimatedCostUsd, exchangeRate)})
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${usageColor} transition-all duration-300`} style={{ width: `${usagePercent}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">入力: {formatTokens(nonCachedInputTokens)}</span>
            <span className={`text-xs ${usageTextColor}`}>{usagePercent.toFixed(1)}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">出力: {formatTokens(session.tokenUsage.outputTokens)}</span>
          </div>
          {session.tokenUsage.cachedInputTokens > 0 && (
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                キャッシュ読取: {formatTokens(session.tokenUsage.cachedInputTokens)}
              </span>
            </div>
          )}
        </div>
      )}

      {session.progress ? (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">タスク進捗</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {session.progress.completed}/{session.progress.total} ({session.progress.percent}%)
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${session.progress.percent}%` }}
            />
          </div>
          <div className="space-y-1">
            {session.progress.steps.slice(0, 5).map((step, index) => (
              <div key={`${session.id}-${index}`} className={`text-xs ${getPlanItemClass(step.status)}`}>
                {getPlanItemIcon(step.status)} {step.step}
              </div>
            ))}
            {session.progress.steps.length > 5 && (
              <div className="text-xs text-gray-500">... 他{session.progress.steps.length - 5}件</div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          update_plan の進捗データなし
        </div>
      )}
    </div>
  );
}

function SessionGroup({
  title,
  sessions,
  exchangeRate,
  getCustomTitle,
  onTitleEdit,
}: {
  title: string;
  sessions: CodexSession[];
  exchangeRate: number;
  getCustomTitle: (sessionId: string) => string | undefined;
  onTitleEdit: (session: CodexSession) => void;
}) {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">{sessions.length} sessions</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {sessions.map((session) => (
          <CodexSessionCard
            key={session.id}
            session={session}
            exchangeRate={exchangeRate}
            customTitle={getCustomTitle(session.id)}
            onTitleEdit={() => onTitleEdit(session)}
          />
        ))}
      </div>
    </section>
  );
}

export function CodexMonitor() {
  const [data, setData] = useState<CodexSessionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState(FALLBACK_RATE);
  const [rateSource, setRateSource] = useState<"api" | "fallback">("fallback");
  const [customTitles, setCustomTitles] = useState<Record<string, string>>({});
  const [editingSession, setEditingSession] = useState<CodexSession | null>(null);
  const [showTitleEditModal, setShowTitleEditModal] = useState(false);

  const getTitleKey = (sessionId: string) => `codex:${sessionId}`;
  const getCustomTitle = (sessionId: string) => customTitles[getTitleKey(sessionId)];

  const handleTitleEdit = (sessionId: string, customTitle: string) => {
    const next = { ...customTitles };
    const key = getTitleKey(sessionId);
    if (customTitle) {
      next[key] = customTitle;
    } else {
      delete next[key];
    }
    setCustomTitles(next);
    localStorage.setItem(CUSTOM_TITLES_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CUSTOM_TITLES_UPDATED_EVENT));
    setShowTitleEditModal(false);
    setEditingSession(null);
  };

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/codex-sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch Codex sessions");
      }
      const payload = (await response.json()) as CodexSessionsData;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedTitles = localStorage.getItem(CUSTOM_TITLES_STORAGE_KEY);
    if (savedTitles) {
      try {
        setCustomTitles(JSON.parse(savedTitles));
      } catch {
        // Ignore invalid localStorage value
      }
    }

    getExchangeRate().then((result) => {
      setExchangeRate(result.rate);
      setRateSource(result.source);
    });
    fetchData();
  }, [fetchData]);

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

  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        Loading Codex sessions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        No data available.
      </div>
    );
  }

  const pricing = data.summary.pricingDefaults;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Codex Sessions</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              last updated {new Date(data.lastUpdated).toLocaleString()} | USD/JPY {exchangeRate} ({rateSource})
            </p>
          </div>
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            pricing / 1M: in ${pricing.input} | out ${pricing.output} | cached ${pricing.cachedInput}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Sessions</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {data.summary.totalSessions}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              active {data.summary.activeSessions} | recent {data.summary.recentSessions}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Token Usage</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatTokens(data.summary.totalTokens)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              in {formatTokens(data.summary.totalInputTokens)} | out {formatTokens(data.summary.totalOutputTokens)}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Estimated Cost</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatUsd(data.summary.totalEstimatedCostUsd)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatJpy(data.summary.totalEstimatedCostUsd, exchangeRate)}
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Activity</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {formatTokens(data.summary.totalToolCalls)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              tools | {formatTokens(data.summary.totalMessages)} msgs
            </div>
          </div>
        </div>
      </section>

      <SessionGroup
        title="Active"
        sessions={data.grouped.active}
        exchangeRate={exchangeRate}
        getCustomTitle={getCustomTitle}
        onTitleEdit={(session) => {
          setEditingSession(session);
          setShowTitleEditModal(true);
        }}
      />
      <SessionGroup
        title="Recent"
        sessions={data.grouped.recent}
        exchangeRate={exchangeRate}
        getCustomTitle={getCustomTitle}
        onTitleEdit={(session) => {
          setEditingSession(session);
          setShowTitleEditModal(true);
        }}
      />
      <SessionGroup
        title="Past"
        sessions={data.grouped.past}
        exchangeRate={exchangeRate}
        getCustomTitle={getCustomTitle}
        onTitleEdit={(session) => {
          setEditingSession(session);
          setShowTitleEditModal(true);
        }}
      />

      {showTitleEditModal && editingSession && (
        <TitleEditModal
          session={{
            id: editingSession.id,
            name: editingSession.name,
            messageCount: editingSession.userMessageCount + editingSession.agentMessageCount,
            created: editingSession.created,
            modified: editingSession.modified,
            projectPath: editingSession.cwd,
            status: editingSession.status,
            minutesAgo: editingSession.minutesAgo,
          }}
          currentTitle={getCustomTitle(editingSession.id) || ""}
          onClose={() => {
            setShowTitleEditModal(false);
            setEditingSession(null);
          }}
          onSave={(title) => handleTitleEdit(editingSession.id, title)}
          onReset={() => handleTitleEdit(editingSession.id, "")}
        />
      )}
    </div>
  );
}

