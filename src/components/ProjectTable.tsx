"use client";

import { useState, useMemo, useEffect } from "react";
import { Project, Categories } from "@/lib/types";
import { FavoriteButton } from "@/components/FavoriteButton";

interface ProjectCost {
  projectPath: string;
  projectName: string;
  totalCost: number;
  sessionCount: number;
  totalTokens: number;
  lastUsed: string;
}

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
  const [sortKey, setSortKey] = useState<"name" | "category" | "status" | "cost">("cost");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [projectCosts, setProjectCosts] = useState<Map<string, ProjectCost>>(new Map());
  const [exchangeRate, setExchangeRate] = useState(150);

  // Fetch project costs
  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const res = await fetch("/api/project-costs");
        if (res.ok) {
          const data = await res.json();
          const costsMap = new Map<string, ProjectCost>();
          for (const cost of data.costs || []) {
            // Match by project name (folder name)
            costsMap.set(cost.projectName.toLowerCase(), cost);
          }
          setProjectCosts(costsMap);
        }
      } catch {
        // Ignore errors
      }
    };

    // Fetch exchange rate
    const fetchExchangeRate = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        if (res.ok) {
          const data = await res.json();
          setExchangeRate(data.rates?.JPY || 150);
        }
      } catch {
        // Use default
      }
    };

    fetchCosts();
    fetchExchangeRate();
  }, []);

  const getProjectCost = (project: Project): number => {
    // Try to match by project id (folder name)
    const cost = projectCosts.get(project.id.toLowerCase());
    return cost?.totalCost || 0;
  };

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
      } else if (sortKey === "cost") {
        compare = getProjectCost(a) - getProjectCost(b);
      }
      return sortOrder === "asc" ? compare : -compare;
    });

    return result;
  }, [projects, selectedCategory, selectedTech, searchTerm, sortKey, sortOrder, projectCosts]);

  const handleSort = (key: "name" | "category" | "status" | "cost") => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder(key === "cost" ? "desc" : "asc");
    }
  };

  const formatCost = (cost: number) => {
    if (cost < 0.01) return "-";
    if (cost < 1) return `$${cost.toFixed(2)}`;
    if (cost < 100) return `$${cost.toFixed(1)}`;
    return `$${Math.round(cost)}`;
  };

  const formatJpy = (cost: number) => {
    if (cost < 0.01) return "";
    const jpy = Math.round(cost * exchangeRate);
    return `¥${jpy.toLocaleString()}`;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      archive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400",
      empty: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || colors.active}`}>
        {status}
      </span>
    );
  };

  // Calculate total cost for all displayed projects
  const totalDisplayedCost = filteredProjects.reduce((sum, p) => sum + getProjectCost(p), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              プロジェクト一覧
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredProjects.length}件)
              </span>
            </h2>
            {totalDisplayedCost > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                総コスト: <span className="text-green-600 dark:text-green-400 font-medium">${totalDisplayedCost.toFixed(2)}</span>
                <span className="text-xs ml-1">({formatJpy(totalDisplayedCost)})</span>
              </p>
            )}
          </div>
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
                className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort("cost")}
              >
                コスト {sortKey === "cost" && (sortOrder === "asc" ? "↑" : "↓")}
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
            {filteredProjects.map((project) => {
              const cost = getProjectCost(project);
              return (
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
                  <td className="px-4 py-4 text-right">
                    {cost > 0 ? (
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCost(cost)}
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 block">
                          {formatJpy(cost)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4">{statusBadge(project.status)}</td>
                </tr>
              );
            })}
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
