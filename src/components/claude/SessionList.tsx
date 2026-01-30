"use client";

import { useState } from "react";
import { SessionCard } from "./SessionCard";

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

interface SessionListProps {
  grouped: GroupedSessions;
  exchangeRate: number;
  onSessionClick?: (session: Session) => void;
}

interface SessionGroupProps {
  title: string;
  sessions: Session[];
  exchangeRate: number;
  defaultExpanded?: boolean;
  accentColor: string;
  icon: string;
  onSessionClick?: (session: Session) => void;
}

function SessionGroup({
  title,
  sessions,
  exchangeRate,
  defaultExpanded = true,
  accentColor,
  icon,
  onSessionClick,
}: SessionGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Group header */}
      <button
        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`text-lg ${accentColor}`}>{icon}</span>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">
            {title}
          </h2>
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {sessions.length}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Sessions */}
      {isExpanded && (
        <div className="mt-2 space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              exchangeRate={exchangeRate}
              onClick={() => onSessionClick?.(session)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionList({
  grouped,
  exchangeRate,
  onSessionClick,
}: SessionListProps) {
  return (
    <div>
      {/* Active sessions (5分以内) */}
      <SessionGroup
        title="アクティブ"
        sessions={grouped.active}
        exchangeRate={exchangeRate}
        defaultExpanded={true}
        accentColor="text-green-500"
        icon="🟢"
        onSessionClick={onSessionClick}
      />

      {/* Recent sessions (1時間以内) */}
      <SessionGroup
        title="最近"
        sessions={grouped.recent}
        exchangeRate={exchangeRate}
        defaultExpanded={true}
        accentColor="text-orange-400"
        icon="🟠"
        onSessionClick={onSessionClick}
      />

      {/* Past sessions */}
      <SessionGroup
        title="過去のセッション"
        sessions={grouped.past}
        exchangeRate={exchangeRate}
        defaultExpanded={false}
        accentColor="text-gray-400"
        icon="⚪"
        onSessionClick={onSessionClick}
      />

      {/* Empty state */}
      {grouped.active.length === 0 &&
        grouped.recent.length === 0 &&
        grouped.past.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📭</div>
            <p>セッションが見つかりません</p>
          </div>
        )}
    </div>
  );
}
