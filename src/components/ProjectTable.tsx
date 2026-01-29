"use client";

import { useState, useMemo } from "react";
import { Project, Categories } from "@/lib/types";
import { FavoriteButton } from "@/components/FavoriteButton";

interface ProjectTableProps {
  projects: Project[];
  categories: Categories;
  selectedCategory?: string | null;
  selectedTech?: string | null;
  onProjectClick?: (project: Project) => void;
  favorites?: Set<string>;
  onToggleFavorite?: (projectId: string) => void;
}

export function ProjectTable({
  projects,
  categories,
  selectedCategory,
  selectedTech,
  onProjectClick,
  favorites,
  onToggleFavorite,
}: ProjectTableProps) {
  const [sortKey, setSortKey] = useState<"name" | "category" | "status">("category");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Filter by category
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Filter by technology
    if (selectedTech) {
      result = result.filter((p) => p.technologies.includes(selectedTech));
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.technologies.some((t) => t.toLowerCase().includes(term))
      );
    }

    // Sort
    result.sort((a, b) => {
      let compare = 0;
      if (sortKey === "name") {
        compare = a.name.localeCompare(b.name);
      } else if (sortKey === "category") {
        compare = a.category.localeCompare(b.category);
      } else if (sortKey === "status") {
        compare = a.status.localeCompare(b.status);
      }
      return sortOrder === "asc" ? compare : -compare;
    });

    return result;
  }, [projects, selectedCategory, selectedTech, searchTerm, sortKey, sortOrder]);

  const handleSort = (key: "name" | "category" | "status") => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      archive: "bg-gray-100 text-gray-800",
      empty: "bg-yellow-100 text-yellow-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || colors.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            プロジェクト一覧
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({filteredProjects.length}件)
            </span>
          </h2>
          <input
            type="text"
            placeholder="検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm w-full sm:w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        {(selectedCategory || selectedTech) && (
          <div className="mt-2 flex gap-2">
            {selectedCategory && (
              <span
                className="px-2 py-1 rounded text-xs text-white"
                style={{ backgroundColor: categories[selectedCategory]?.color }}
              >
                {categories[selectedCategory]?.name}
              </span>
            )}
            {selectedTech && (
              <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white">
                {selectedTech}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {favorites && onToggleFavorite && (
                <th className="px-2 py-3 w-10"></th>
              )}
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("name")}
              >
                プロジェクト名 {sortKey === "name" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("category")}
              >
                カテゴリ {sortKey === "category" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                技術スタック
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("status")}
              >
                状態 {sortKey === "status" && (sortOrder === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {filteredProjects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onProjectClick?.(project)}
              >
                {favorites && onToggleFavorite && (
                  <td className="px-2 py-4">
                    <FavoriteButton
                      projectId={project.id}
                      isFavorite={favorites.has(project.id)}
                      onToggle={onToggleFavorite}
                      size="sm"
                    />
                  </td>
                )}
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {project.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {project.description}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: categories[project.category]?.color }}
                  >
                    {categories[project.category]?.name}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.slice(0, 4).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-200"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-500 rounded text-xs text-gray-600 dark:text-gray-300">
                        +{project.technologies.length - 4}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">{statusBadge(project.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredProjects.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          該当するプロジェクトがありません
        </div>
      )}
    </div>
  );
}
