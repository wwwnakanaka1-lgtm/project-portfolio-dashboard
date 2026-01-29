"use client";

import { useState, useMemo } from "react";
import { CategoryChart } from "@/components/CategoryChart";
import { TechChart } from "@/components/TechChart";
import { RelationshipGraph } from "@/components/RelationshipGraph";
import { ProjectTable } from "@/components/ProjectTable";
import { DetailPanel } from "@/components/DetailPanel";
import ExportButton from "@/components/ExportButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette, SearchTrigger } from "@/components/CommandPalette";
import { FavoritesFilter, useFavorites } from "@/components/FavoriteButton";
import projectData from "@/lib/projects.json";
import { Project, ProjectData } from "@/lib/types";

const data = projectData as ProjectData;

type Tab = "overview" | "graph" | "table";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Favorites hook
  const { favorites, toggleFavorite, isFavorite, mounted: favoritesMounted } = useFavorites();

  // Filter projects based on favorites if needed
  const filteredByFavorites = useMemo(() => {
    if (!showFavoritesOnly) return data.projects;
    return data.projects.filter((p) => favorites.has(p.id));
  }, [showFavoritesOnly, favorites]);

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
    setSelectedTech(null);
  };

  const handleTechClick = (tech: string) => {
    setSelectedTech(tech === selectedTech ? null : tech);
    setSelectedCategory(null);
  };

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project);
  };

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedTech(null);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "概要" },
    { id: "graph", label: "関係性グラフ" },
    { id: "table", label: "一覧" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Command Palette */}
      <CommandPalette
        projects={data.projects}
        categories={data.categories}
        onSelectProject={handleProjectClick}
      />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Project Portfolio Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              C:\Users\wwwhi\Create 内のプロジェクト一覧と関係性
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchTrigger onClick={() => setCommandPaletteOpen(true)} />
            <ThemeToggle />
            <ExportButton
              projects={data.projects}
              categories={data.categories}
              mainContentId="main-content"
            />
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-blue-600">
                  {data.projects.length}
                </span>
                <span className="text-gray-500">プロジェクト</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-green-600">
                  {data.projects.filter((p) => p.status === "active").length}
                </span>
                <span className="text-gray-500">アクティブ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-purple-600">
                  {Object.keys(data.categories).length}
                </span>
                <span className="text-gray-500">カテゴリ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-orange-600">
                  {new Set(data.projects.flatMap((p) => p.technologies)).size}
                </span>
                <span className="text-gray-500">技術</span>
              </div>
            </div>
            {favoritesMounted && (
              <FavoritesFilter
                showFavoritesOnly={showFavoritesOnly}
                onToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
                favoritesCount={favorites.size}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Filter Bar */}
      {(selectedCategory || selectedTech) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              フィルター:
            </span>
            {selectedCategory && (
              <span
                className="px-2 py-1 rounded text-xs text-white flex items-center gap-1"
                style={{
                  backgroundColor: data.categories[selectedCategory]?.color,
                }}
              >
                {data.categories[selectedCategory]?.name}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </span>
            )}
            {selectedTech && (
              <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white flex items-center gap-1">
                {selectedTech}
                <button
                  onClick={() => setSelectedTech(null)}
                  className="hover:bg-white/20 rounded-full p-0.5"
                >
                  ×
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs text-blue-600 hover:underline ml-2"
            >
              クリア
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <CategoryChart
              projects={filteredByFavorites}
              categories={data.categories}
              onCategoryClick={handleCategoryClick}
            />
            <TechChart
              projects={filteredByFavorites}
              onTechClick={handleTechClick}
            />
            <ProjectTable
              projects={filteredByFavorites}
              categories={data.categories}
              selectedCategory={selectedCategory}
              selectedTech={selectedTech}
              onProjectClick={handleProjectClick}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </div>
        )}

        {activeTab === "graph" && (
          <RelationshipGraph
            projects={filteredByFavorites}
            categories={data.categories}
            onProjectClick={handleProjectClick}
          />
        )}

        {activeTab === "table" && (
          <ProjectTable
            projects={filteredByFavorites}
            categories={data.categories}
            selectedCategory={selectedCategory}
            selectedTech={selectedTech}
            onProjectClick={handleProjectClick}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      {/* Detail Panel Modal */}
      <DetailPanel
        project={selectedProject}
        categories={data.categories}
        onClose={() => setSelectedProject(null)}
      />

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Project Portfolio Dashboard | Generated: 2026-01-25
        </div>
      </footer>
    </div>
  );
}
