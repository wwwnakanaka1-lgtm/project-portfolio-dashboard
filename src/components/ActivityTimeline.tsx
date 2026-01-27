"use client";

import React, { useMemo } from "react";

interface ActivityTimelineProps {
  activity: {
    lastUpdated: string;
    commits30d: number;
    activityScore: number;
    dailyActivity?: number[];
  };
}

/**
 * プロジェクトのアクティビティを表示するコンポーネント
 * - 最終更新日
 * - 過去30日のヒートマップ
 * - アクティブ度スコア（プログレスバー）
 * - コミット頻度
 */
export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activity,
}) => {
  const { lastUpdated, commits30d, activityScore, dailyActivity } = activity;

  // 日別アクティビティがない場合はデフォルトデータを使用
  const activityData = useMemo(() => {
    if (dailyActivity && dailyActivity.length === 30) {
      return dailyActivity;
    }
    // デフォルトデータ: 30日分のサンプルアクティビティ
    // 実際の使用時はdailyActivityを渡すことを想定
    return [0, 1, 2, 0, 3, 5, 2, 1, 0, 4, 6, 3, 2, 1, 0,
            2, 4, 5, 3, 1, 0, 2, 3, 4, 5, 3, 2, 1, 2, 3];
  }, [dailyActivity]);

  // アクティビティレベルに応じた色を取得（ダークモード対応）
  const getActivityColor = (value: number, maxValue: number): string => {
    if (maxValue === 0) return "bg-gray-100 dark:bg-gray-800";
    const intensity = value / maxValue;
    if (intensity === 0) return "bg-gray-100 dark:bg-gray-800";
    if (intensity < 0.25) return "bg-emerald-200 dark:bg-emerald-900";
    if (intensity < 0.5) return "bg-emerald-400 dark:bg-emerald-700";
    if (intensity < 0.75) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-500";
  };

  // アクティビティの最大値を計算
  const maxActivity = useMemo(
    () => Math.max(...activityData, 1),
    [activityData]
  );

  // 日付ラベルを生成（過去30日）
  const dateLabels = useMemo(() => {
    const labels: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }));
    }
    return labels;
  }, []);

  // コミット頻度の計算（日平均）
  const avgCommitsPerDay = (commits30d / 30).toFixed(1);

  // アクティブ度に応じたラベル
  const getActivityLabel = (score: number): string => {
    if (score >= 80) return "非常に活発";
    if (score >= 60) return "活発";
    if (score >= 40) return "普通";
    if (score >= 20) return "低調";
    return "休止中";
  };

  // プログレスバーの色を取得
  const getProgressColor = (score: number): string => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    if (score >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  // 最終更新日のフォーマット
  const formattedLastUpdated = useMemo(() => {
    try {
      const date = new Date(lastUpdated);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return lastUpdated;
    }
  }, [lastUpdated]);

  // 最終更新からの経過時間
  const timeSinceUpdate = useMemo(() => {
    try {
      const updateDate = new Date(lastUpdated);
      const now = new Date();
      const diffMs = now.getTime() - updateDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffDays > 0) return `${diffDays}日前`;
      if (diffHours > 0) return `${diffHours}時間前`;
      if (diffMinutes > 0) return `${diffMinutes}分前`;
      return "たった今";
    } catch {
      return "";
    }
  }, [lastUpdated]);

  return (
    <div className="w-full p-4 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* ヘッダー: 最終更新日 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          アクティビティ
        </h3>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">最終更新</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formattedLastUpdated}
          </p>
          {timeSinceUpdate && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              ({timeSinceUpdate})
            </p>
          )}
        </div>
      </div>

      {/* ヒートマップ: 過去30日のアクティビティ */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
          過去30日のアクティビティ
        </p>
        <div className="flex flex-wrap gap-1">
          {activityData.map((value, index) => (
            <div
              key={index}
              className={`w-6 h-6 rounded-sm ${getActivityColor(value, maxActivity)} transition-colors duration-200 hover:ring-2 hover:ring-gray-400 dark:hover:ring-gray-500 cursor-pointer`}
              title={`${dateLabels[index]}: ${value}件`}
            />
          ))}
        </div>
        {/* 凡例 */}
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>少</span>
          <div className="flex gap-0.5">
            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
            <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
            <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-600" />
            <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
          </div>
          <span>多</span>
        </div>
      </div>

      {/* アクティブ度スコア */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            アクティブ度
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getActivityLabel(activityScore)}
            </span>
            <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {activityScore}/100
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor(activityScore)} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${Math.min(activityScore, 100)}%` }}
          />
        </div>
      </div>

      {/* コミット頻度 */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {commits30d}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            過去30日のコミット
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {avgCommitsPerDay}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            日平均コミット
          </p>
        </div>
      </div>
    </div>
  );
};

export default ActivityTimeline;
