"use client";

import { useState } from "react";

interface RateLimitSyncModalProps {
  onClose: () => void;
  onSync: (percent: number, hours: number, minutes: number) => void;
  onReset: () => void;
}

export function RateLimitSyncModal({ onClose, onSync, onReset }: RateLimitSyncModalProps) {
  const [percent, setPercent] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");

  const handleSync = () => {
    const pct = parseInt(percent) || 0;
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    onSync(pct, h, m);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          レート制限を同期
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Claudeの「プラン使用制限」から値を入力してください
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            使用率 (%)
          </label>
          <input
            type="number"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            min="0"
            max="100"
            placeholder="50"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            リセットまでの時間
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              min="0"
              max="5"
              placeholder="2"
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">時間</span>
            <input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              min="0"
              max="59"
              placeholder="30"
              className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">分</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={handleSync}
          >
            同期
          </button>
          <button
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            onClick={onReset}
          >
            推定に戻す
          </button>
        </div>
      </div>
    </div>
  );
}
