"use client";

import { useState } from "react";

interface Session {
  id: string;
  name: string;
  messageCount: number;
  created: string;
  modified: string;
  projectPath?: string;
  status: "active" | "recent" | "past";
  minutesAgo: number;
}

interface TitleEditModalProps {
  session: Session;
  currentTitle: string;
  onClose: () => void;
  onSave: (title: string) => void;
  onReset: () => void;
}

export function TitleEditModal({ session, currentTitle, onClose, onSave, onReset }: TitleEditModalProps) {
  const [title, setTitle] = useState(currentTitle);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          タイトルを編集
        </h3>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="カスタムタイトル"
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
        />

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          元のタイトル: {session.name}
        </p>

        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => onSave(title)}
          >
            保存
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
            リセット
          </button>
        </div>
      </div>
    </div>
  );
}
