"use client";

import { useEffect, useState } from "react";

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
}

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
}

interface SessionDetailModalProps {
  session: Session;
  customTitle?: string;
  exchangeRate: number;
  onClose: () => void;
}

export function SessionDetailModal({ session, customTitle, exchangeRate, onClose }: SessionDetailModalProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };
    fetchTodos();
  }, [session.id]);

  const completedCount = todos.filter((t) => t.status === "completed").length;
  const progressPercent = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP");
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      default:
        return "⏳";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {customTitle || session.name}
        </h3>

        <div className="space-y-2 mb-6">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>セッションID:</strong> <span className="text-gray-500 dark:text-gray-400">{session.id}</span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>作成日時:</strong> <span className="text-gray-500 dark:text-gray-400">{formatDate(session.created)}</span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>更新日時:</strong> <span className="text-gray-500 dark:text-gray-400">{formatDate(session.modified)}</span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>メッセージ数:</strong> <span className="text-gray-500 dark:text-gray-400">{session.messageCount}</span>
          </p>
          {session.projectPath && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>プロジェクト:</strong> <span className="text-gray-500 dark:text-gray-400">{session.projectPath}</span>
            </p>
          )}
          {session.tokenUsage && (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>トークン:</strong>{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  入力 {formatTokens(session.tokenUsage.inputTokens)} / 出力 {formatTokens(session.tokenUsage.outputTokens)}
                </span>
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>キャッシュ:</strong>{" "}
                <span className="text-gray-500 dark:text-gray-400">
                  読取 {formatTokens(session.tokenUsage.cacheReadTokens)} / 作成 {formatTokens(session.tokenUsage.cacheCreationTokens)}
                </span>
              </p>
            </>
          )}
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>推定コスト:</strong>{" "}
            <span className="text-green-600 dark:text-green-400">
              ${session.estimatedCost.toFixed(4)} (¥{Math.round(session.estimatedCost * exchangeRate).toLocaleString()})
            </span>
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">タスク進捗</h4>
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>
          ) : todos.length > 0 ? (
            <>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 mb-3 block">
                {completedCount}/{todos.length} 完了 ({progressPercent}%)
              </span>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {todos.map((todo, idx) => (
                  <div
                    key={idx}
                    className={`text-sm py-1 ${
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
              </div>
            </>
          ) : (
            <div className="text-gray-500 dark:text-gray-400">タスクがありません</div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
