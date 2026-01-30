"use client";

import { useState } from "react";

interface ConfigData {
  hasApiKey: boolean;
  maskedKey: string | null;
  keyType: "admin" | "standard" | "oauth" | "unknown" | null;
  updatedAt?: string;
}

interface SettingsModalProps {
  config: ConfigData | null;
  onClose: () => void;
  onSave: (apiKey: string) => void;
  onDelete: () => void;
}

export function SettingsModal({ config, onClose, onSave, onDelete }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");

  const getKeyTypeLabel = (keyType: string | null) => {
    switch (keyType) {
      case "admin":
        return "Admin API Key";
      case "standard":
        return "Standard API Key";
      case "oauth":
        return "OAuth (Max Plan)";
      default:
        return "未設定";
    }
  };

  const getKeyTypeColorClass = (keyType: string | null) => {
    switch (keyType) {
      case "admin":
        return "text-purple-600 dark:text-purple-400";
      case "oauth":
        return "text-blue-600 dark:text-blue-400";
      case "standard":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
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
          Anthropic API 設定
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          APIキーを設定すると、正確な使用量とレート制限を取得できます
        </p>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 mb-4">
          <span className="text-sm text-gray-700 dark:text-gray-300">現在の設定: </span>
          <span className={`text-sm font-medium ${getKeyTypeColorClass(config?.keyType ?? null)}`}>
            {config?.hasApiKey ? (
              <>
                {getKeyTypeLabel(config.keyType)}
                {config.maskedKey && <span className="ml-2 text-gray-500 dark:text-gray-400">{config.maskedKey}</span>}
              </>
            ) : (
              "未設定"
            )}
          </span>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Anthropic API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Admin APIキー (sk-ant-admin-...) で使用量レポートも取得可能
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => onSave(apiKey)}
          >
            保存
          </button>
          <button
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            キャンセル
          </button>
          {config?.hasApiKey && (
            <button
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              onClick={onDelete}
            >
              削除
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
