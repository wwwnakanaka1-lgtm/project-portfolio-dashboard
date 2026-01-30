"use client";

import { useState, useEffect } from "react";

interface ManualTask {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface TaskModalProps {
  task: ManualTask | null;
  onClose: () => void;
  onSave: (task: ManualTask) => void;
  onDelete?: () => void;
}

export function TaskModal({ task, onClose, onSave, onDelete }: TaskModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed">("pending");

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || "");
      setStatus(task.status);
    } else {
      setName("");
      setDescription("");
      setStatus("pending");
    }
  }, [task]);

  const handleSave = () => {
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const newTask: ManualTask = {
      id: task?.id || `task-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      status,
      createdAt: task?.createdAt || now,
      updatedAt: now,
    };
    onSave(newTask);
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {task ? "タスクを編集" : "タスクを追加"}
        </h3>

        <div className="mb-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="タスク名（例: LINE Bot開発）"
            maxLength={50}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-4">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="説明（任意）"
            maxLength={200}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        <div className="mb-6">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pending">待機中</option>
            <option value="in_progress">進行中</option>
            <option value="completed">完了</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            onClick={handleSave}
          >
            保存
          </button>
          <button
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={onClose}
          >
            キャンセル
          </button>
          {task && onDelete && (
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
