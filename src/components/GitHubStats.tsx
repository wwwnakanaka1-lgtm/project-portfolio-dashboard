"use client";

import { useEffect, useState } from "react";
import { GitHubStats as GitHubStatsType } from "@/lib/types";
import { fetchGitHubStats, formatRelativeDate, formatNumber } from "@/lib/github";

interface GitHubStatsProps {
  repo: string;
  compact?: boolean;
}

export function GitHubStats({ repo, compact = false }: GitHubStatsProps) {
  const [stats, setStats] = useState<GitHubStatsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchGitHubStats(repo);
        if (!cancelled) {
          if (data) {
            setStats(data);
          } else {
            setError("データを取得できませんでした");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("APIエラーが発生しました");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [repo]);

  // ローディング状態
  if (loading) {
    return (
      <div className={`${compact ? "flex gap-2" : "space-y-2"}`}>
        {compact ? (
          <>
            <StatBadgeSkeleton />
            <StatBadgeSkeleton />
            <StatBadgeSkeleton />
          </>
        ) : (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // エラー状態（graceful degradation）
  if (error || !stats) {
    return null; // データなしでも表示可能
  }

  // コンパクト表示（バッジのみ）
  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <StatBadge icon={<StarIcon />} value={stats.stars} label="Stars" color="yellow" />
        <StatBadge icon={<ForkIcon />} value={stats.forks} label="Forks" color="blue" />
        <StatBadge icon={<IssueIcon />} value={stats.openIssues} label="Issues" color="green" />
        {stats.openPRs > 0 && (
          <StatBadge icon={<PRIcon />} value={stats.openPRs} label="PRs" color="purple" />
        )}
      </div>
    );
  }

  // フル表示（詳細パネル用）
  return (
    <div className="space-y-4">
      {/* バッジ行 */}
      <div className="flex flex-wrap gap-2">
        <StatBadge icon={<StarIcon />} value={stats.stars} label="Stars" color="yellow" />
        <StatBadge icon={<ForkIcon />} value={stats.forks} label="Forks" color="blue" />
        <StatBadge icon={<IssueIcon />} value={stats.openIssues} label="Issues" color="green" />
        {stats.openPRs > 0 && (
          <StatBadge icon={<PRIcon />} value={stats.openPRs} label="PRs" color="purple" />
        )}
        <StatBadge icon={<EyeIcon />} value={stats.watchers} label="Watchers" color="gray" />
      </div>

      {/* 最終コミット情報 */}
      {stats.lastCommitDate && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <CommitIcon />
            <span>最終コミット: {formatRelativeDate(stats.lastCommitDate)}</span>
          </div>
          {stats.lastCommitMessage && (
            <p className="mt-1 pl-6 text-xs text-gray-500 dark:text-gray-500 truncate max-w-md">
              {stats.lastCommitMessage}
            </p>
          )}
        </div>
      )}

      {/* リポジトリリンク */}
      <a
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
      >
        <GitHubIcon />
        <span>GitHubで開く</span>
        <ExternalLinkIcon />
      </a>
    </div>
  );
}

// スケルトンバッジ
function StatBadgeSkeleton() {
  return (
    <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
  );
}

// 統計バッジコンポーネント
interface StatBadgeProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: "yellow" | "blue" | "green" | "purple" | "gray";
}

function StatBadge({ icon, value, label, color }: StatBadgeProps) {
  const colorClasses = {
    yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    blue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    gray: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClasses[color]}`}
      title={label}
    >
      {icon}
      <span>{formatNumber(value)}</span>
    </span>
  );
}

// アイコンコンポーネント
function StarIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v.878A2.25 2.25 0 005.75 8.5h1.5v2.128a2.251 2.251 0 101.5 0V8.5h1.5a2.25 2.25 0 002.25-2.25v-.878a2.25 2.25 0 10-1.5 0v.878a.75.75 0 01-.75.75h-4.5A.75.75 0 015 6.25v-.878zm3.75 7.378a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3-8.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
    </svg>
  );
}

function IssueIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
    </svg>
  );
}

function PRIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 010 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.831.88 9.577.43 8.9a1.62 1.62 0 010-1.798c.45-.678 1.367-1.932 2.637-3.023C4.33 2.992 6.019 2 8 2zM1.679 7.932a.12.12 0 000 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 000-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.824.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717zM8 10a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

function CommitIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <path fillRule="evenodd" d="M10.5 7.75a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm1.43.75a4.002 4.002 0 01-7.86 0H.75a.75.75 0 110-1.5h3.32a4.001 4.001 0 017.86 0h3.32a.75.75 0 110 1.5h-3.32z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}
