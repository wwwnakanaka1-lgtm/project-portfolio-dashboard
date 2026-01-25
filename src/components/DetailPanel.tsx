"use client";

import { Project, Categories } from "@/lib/types";

interface DetailPanelProps {
  project: Project | null;
  categories: Categories;
  onClose: () => void;
}

export function DetailPanel({ project, categories, onClose }: DetailPanelProps) {
  if (!project) return null;

  const category = categories[project.category];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div
          className="p-6 text-white"
          style={{ backgroundColor: category?.color || "#6B7280" }}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase opacity-75">{category?.name}</span>
              <h2 className="text-2xl font-bold mt-1">{project.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
              説明
            </h3>
            <p className="text-gray-900 dark:text-white">{project.description}</p>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
              状態
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                project.status === "active"
                  ? "bg-green-100 text-green-800"
                  : project.status === "archive"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {project.status === "active"
                ? "アクティブ"
                : project.status === "archive"
                ? "アーカイブ"
                : "空"}
            </span>
          </div>

          {/* Technologies */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
              技術スタック
            </h3>
            <div className="flex flex-wrap gap-2">
              {project.technologies.length > 0 ? (
                project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    {tech}
                  </span>
                ))
              ) : (
                <span className="text-gray-400">なし</span>
              )}
            </div>
          </div>

          {/* Path */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
              フォルダパス
            </h3>
            <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-800 dark:text-gray-200 break-all">
              {project.path}
            </code>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t dark:border-gray-700">
            <button
              onClick={() => {
                navigator.clipboard.writeText(project.path);
              }}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
            >
              パスをコピー
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`cd "${project.path}"`);
              }}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
            >
              cdコマンドをコピー
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
