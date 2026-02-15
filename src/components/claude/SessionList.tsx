"use client";

import { useState, useEffect } from "react";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

export interface Session {
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

export interface GroupedSessions {
  active: Session[];
  recent: Session[];
  past: Session[];
}

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

interface SessionListProps {
  grouped: GroupedSessions;
  exchangeRate: number;
  customTitles: Record<string, string>;
  onTitleEdit: (session: Session) => void;
  onSessionClick: (session: Session) => void;
}

interface SessionCardProps {
  session: Session;
  exchangeRate: number;
  customTitle?: string;
  onTitleEdit: () => void;
  onClick: () => void;
  borderClassName?: string;
}

export function SessionCard({
  session,
  exchangeRate,
  customTitle,
  onTitleEdit,
  onClick,
  borderClassName,
}: SessionCardProps) {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const res = await fetch(`/api/todos?sessionId=${session.id}`);
        if (res.ok) {
          const data = await res.json();
          setTodos(data.todos || []);
        }
      } catch {
        // Ignore errors
      }
    };
    fetchTodos();
  }, [session.id]);

  const formatTime = (minutesAgo: number) => {
    if (minutesAgo < 1) return "たった今";
    if (minutesAgo < 60) return `${Math.round(minutesAgo)}分前`;
    const hours = Math.floor(minutesAgo / 60);
    if (hours < 24) return `${hours}時間前`;
    const days = Math.floor(hours / 24);
    return `${days}日前`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(2)}M`;
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getTimeClass = () => {
    if (session.status === "active") return "text-green-500 animate-pulse";
    if (session.status === "recent") return "text-blue-500";
    return "text-gray-500";
  };

  const getCardClass = () => {
    if (session.status === "active") return "border-green-500 bg-green-50 dark:bg-green-900/20";
    if (session.status === "recent") return "border-blue-500 bg-blue-50 dark:bg-blue-900/20";
    return "border-gray-200 dark:border-gray-700";
  };

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const progressPercent = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  const getStatusIcon = (status: Todo["status"]) => {
    switch (status) {
      case "completed":
        return "✓";
      case "in_progress":
        return "↻";
      default:
        return "⌛";
    }
  };

  const maxCostForGauge = 5;
  const usagePercent = Math.min(100, (session.estimatedCost / maxCostForGauge) * 100);
  const getUsageColorClasses = () => {
    if (usagePercent >= 80) return { bar: "bg-red-500", text: "text-red-500" };
    if (usagePercent >= 50) return { bar: "bg-yellow-500", text: "text-yellow-500" };
    return { bar: "bg-blue-500", text: "text-blue-500" };
  };
  const usageColors = getUsageColorClasses();

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border ${getCardClass()} ${borderClassName ?? ""} p-4 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="font-medium text-gray-900 dark:text-white truncate">{customTitle || session.name}</span>
          <button
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-xs flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onTitleEdit();
            }}
            title="タイトルを編集"
          >
            ✎
          </button>
        </div>
        <span className={`text-sm flex-shrink-0 ${getTimeClass()}`}>{formatTime(session.minutesAgo)}</span>
      </div>

      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <span>💬 {session.messageCount}</span>
        {session.tokenUsage && <span>🔤 {formatTokens(session.tokenUsage.totalTokens)}</span>}
      </div>

      {session.tokenUsage && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">トークン使用量</span>
            <span className="text-xs text-green-600 dark:text-green-400">
              ${session.estimatedCost.toFixed(4)} (￥{Math.round(session.estimatedCost * exchangeRate).toLocaleString()})
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full ${usageColors.bar} transition-all duration-300`} style={{ width: `${usagePercent}%` }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">入力: {formatTokens(session.tokenUsage.inputTokens)}</span>
            <span className={`text-xs ${usageColors.text}`}>{usagePercent.toFixed(1)}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">出力: {formatTokens(session.tokenUsage.outputTokens)}</span>
          </div>
          {(session.tokenUsage.cacheReadTokens > 0 || session.tokenUsage.cacheCreationTokens > 0) && (
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-gray-400 dark:text-gray-500">
                キャッシュ読取: {formatTokens(session.tokenUsage.cacheReadTokens)}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                キャッシュ作成: {formatTokens(session.tokenUsage.cacheCreationTokens)}
              </span>
            </div>
          )}
        </div>
      )}

      {todos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">タスク進捗</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {completedCount}/{todos.length} ({progressPercent}%)
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="space-y-1">
            {todos.slice(0, 5).map((todo, idx) => (
              <div
                key={idx}
                className={`text-xs ${
                  todo.status === "completed"
                    ? "text-green-600 dark:text-green-400 line-through"
                    : todo.status === "in_progress"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {getStatusIcon(todo.status)} {todo.content}
              </div>
            ))}
            {todos.length > 5 && <div className="text-xs text-gray-500">... 他{todos.length - 5}件</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export function SessionList({ grouped, exchangeRate, customTitles, onTitleEdit, onSessionClick }: SessionListProps) {
  const [pastCollapsed, setPastCollapsed] = useState(true);

  return (
    <>
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          アクティブ (5分以内)
          <span className="text-sm font-normal text-gray-500">({grouped.active.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.active.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              exchangeRate={exchangeRate}
              customTitle={customTitles[session.id]}
              onTitleEdit={() => onTitleEdit(session)}
              onClick={() => onSessionClick(session)}
            />
          ))}
          {grouped.active.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400 p-4">アクティブなセッションはありません</div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          最近 (1時間以内)
          <span className="text-sm font-normal text-gray-500">({grouped.recent.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {grouped.recent.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              exchangeRate={exchangeRate}
              customTitle={customTitles[session.id]}
              onTitleEdit={() => onTitleEdit(session)}
              onClick={() => onSessionClick(session)}
            />
          ))}
          {grouped.recent.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400 p-4">最近のセッションはありません</div>
          )}
        </div>
      </section>

      <section className="mb-6">
        <h2
          className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2 cursor-pointer hover:text-blue-600"
          onClick={() => setPastCollapsed(!pastCollapsed)}
        >
          <span className={`transform transition-transform ${pastCollapsed ? "" : "rotate-90"}`}>{">"}</span>
          過去のセッション
          <span className="text-sm font-normal text-gray-500">({grouped.past.length})</span>
        </h2>
        {!pastCollapsed && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped.past.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                exchangeRate={exchangeRate}
                customTitle={customTitles[session.id]}
                onTitleEdit={() => onTitleEdit(session)}
                onClick={() => onSessionClick(session)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
