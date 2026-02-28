"use client";

import { useState, useEffect } from "react";
import { TokenGauge } from "./TokenGauge";
import { InlineTasks } from "./InlineTasks";

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

interface Todo {
  content: string;
  status: "completed" | "in_progress" | "pending";
  activeForm?: string;
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

interface SessionCardProps {
  session: Session;
  exchangeRate: number;
  onClick?: () => void;
}

export function SessionCard({ session, exchangeRate, onClick }: SessionCardProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [customTitle, setCustomTitle] = useState<string | null>(null);

  // Load custom title from localStorage
  useEffect(() => {
    const savedTitles = localStorage.getItem("claude-custom-titles");
    if (savedTitles) {
      try {
        const titles = JSON.parse(savedTitles) as Record<string, string>;
        const namespaced = titles[`claude:${session.id}`];
        const legacy = titles[session.id];
        if (namespaced || legacy) {
          setCustomTitle(namespaced || legacy);
        }
      } catch {
        // Ignore invalid stored value
      }
    }
  }, [session.id]);

  // Fetch todos for this session
  useEffect(() => {
    fetch(`/api/todos?sessionId=${session.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.todos) {
          setTodos(data.todos);
        }
      })
      .catch(() => {
        // Ignore errors
      });
  }, [session.id]);

  const formatTime = (minutesAgo: number) => {
    if (minutesAgo < 1) return "たった今";
    if (minutesAgo < 60) return `${minutesAgo}分前`;
    if (minutesAgo < 1440) return `${Math.floor(minutesAgo / 60)}時間前`;
    return `${Math.floor(minutesAgo / 1440)}日前`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(2)}`;
  };

  const formatCostJPY = (cost: number) => {
    return `¥${Math.round(cost * exchangeRate).toLocaleString()}`;
  };

  // Status styling
  const statusStyles = {
    active: "border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20",
    recent: "border-l-4 border-l-orange-400 bg-orange-50 dark:bg-orange-900/10",
    past: "border-l-4 border-l-gray-300 dark:border-l-gray-600",
  };

  const displayTitle = customTitle || session.name;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow ${
        statusStyles[session.status]
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium text-gray-900 dark:text-white truncate ${
              customTitle ? "text-purple-600 dark:text-purple-400" : ""
            }`}
            title={displayTitle}
          >
            {displayTitle}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{formatTime(session.minutesAgo)}</span>
            <span>•</span>
            <span>{session.messageCount} メッセージ</span>
            {session.isUnindexed && (
              <>
                <span>•</span>
                <span className="text-yellow-500" title="インデックス未登録">
                  ⚠
                </span>
              </>
            )}
          </div>
        </div>

        {/* Status indicator */}
        {session.status === "active" && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Active
          </div>
        )}
        {session.status === "recent" && (
          <div className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-full text-xs">
            Recent
          </div>
        )}
      </div>

      {/* Token gauge */}
      {session.tokenUsage && (
        <div className="mt-3">
          <TokenGauge tokenUsage={session.tokenUsage} />
        </div>
      )}

      {/* Cost */}
      {session.estimatedCost > 0 && (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">推定コスト:</span>
          <div className="text-right">
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatCost(session.estimatedCost)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
              ({formatCostJPY(session.estimatedCost)})
            </span>
          </div>
        </div>
      )}

      {/* Inline tasks */}
      {todos.length > 0 && <InlineTasks todos={todos} maxDisplay={3} />}
    </div>
  );
}
