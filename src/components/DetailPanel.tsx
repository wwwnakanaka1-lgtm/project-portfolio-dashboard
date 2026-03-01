"use client";

import { useMemo } from "react";
import { Project, Categories } from "@/lib/types";
import { GitHubStats } from "./GitHubStats";
import { getGrowthLevelInfo, buildEvolutionChain } from "@/lib/growth-level";

interface DetailPanelProps {
  project: Project | null;
  categories: Categories;
  allProjects?: Project[];
  onClose: () => void;
  onProjectClick?: (project: Project) => void;
}

export function DetailPanel({
  project,
  categories,
  allProjects = [],
  onClose,
  onProjectClick,
}: DetailPanelProps) {
  const evolutionChain = useMemo(() => {
    if (!project?.evolution || allProjects.length === 0) return [];
    return buildEvolutionChain(project.id, allProjects);
  }, [project, allProjects]);

  if (!project) return null;

  const category = categories[project.category];
  const growthInfo = getGrowthLevelInfo(project);

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

          {/* Status & Growth Level */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                状態
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-sm ${
                  project.status === "active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : project.status === "archive"
                    ? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400"
                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                }`}
              >
                {project.status === "active"
                  ? "アクティブ"
                  : project.status === "archive"
                  ? "アーカイブ"
                  : "空"}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                成長レベル
              </h3>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${growthInfo.color}18`,
                  color: growthInfo.color,
                }}
              >
                <span>{growthInfo.icon}</span>
                <span>{growthInfo.labelJa}</span>
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {growthInfo.description}
              </p>
            </div>
          </div>

          {/* Evolution Chain */}
          {evolutionChain.length > 1 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-3">
                進化チェーン
              </h3>
              <div className="overflow-x-auto">
                <div className="flex items-center gap-1 min-w-0 pb-2">
                  {evolutionChain.map((chainProject, index) => {
                    const chainInfo = getGrowthLevelInfo(chainProject);
                    const isCurrent = chainProject.id === project.id;
                    return (
                      <div key={chainProject.id} className="flex items-center">
                        <button
                          onClick={() => {
                            if (!isCurrent && onProjectClick) {
                              onProjectClick(chainProject);
                            }
                          }}
                          disabled={isCurrent}
                          className={`flex flex-col items-center p-2.5 rounded-lg transition-all min-w-[100px] ${
                            isCurrent
                              ? "bg-gray-100 dark:bg-gray-700"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          }`}
                          style={isCurrent ? { outline: `2px solid ${chainInfo.color}`, outlineOffset: "1px" } : undefined}
                          title={chainProject.evolution?.evolutionNote}
                        >
                          <span className="text-xl">{chainInfo.icon}</span>
                          <span className="text-xs font-medium text-gray-900 dark:text-white mt-1 text-center leading-tight line-clamp-2">
                            {chainProject.name}
                          </span>
                          <span
                            className="text-[10px] font-medium mt-1 px-1.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${chainInfo.color}18`,
                              color: chainInfo.color,
                            }}
                          >
                            {chainInfo.labelJa}
                          </span>
                        </button>
                        {index < evolutionChain.length - 1 && (
                          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0 mx-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {project.evolution?.evolutionNote && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                  {project.evolution.evolutionNote}
                </p>
              )}
            </div>
          )}

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

          {/* GitHub Stats */}
          {project.githubRepo && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
                GitHub統計
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <GitHubStats repo={project.githubRepo} />
              </div>
            </div>
          )}

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
