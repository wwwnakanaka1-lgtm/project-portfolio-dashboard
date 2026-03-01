"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryChart } from "@/components/CategoryChart";
import { GrowthLevelChart } from "@/components/GrowthLevelChart";
import { TechChart } from "@/components/TechChart";
import { ProjectTable } from "@/components/ProjectTable";
import { DetailPanel } from "@/components/DetailPanel";
import ExportButton from "@/components/ExportButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette, SearchTrigger } from "@/components/CommandPalette";
import { FavoritesFilter, useFavorites } from "@/components/FavoriteButton";
import { GrowthLevelFilter } from "@/components/GrowthLevelFilter";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { StaggerContainer, StaggerItem } from "@/components/ui/AnimatedCard";
import projectData from "@/lib/projects.json";
import Link from "next/link";
import { Project, ProjectData, GrowthLevel } from "@/lib/types";
import { GROWTH_LEVELS } from "@/lib/growth-level";

/** Dynamically imported heavy components for code splitting */
const ClaudeMonitor = dynamic(
  () => import("@/components/claude/ClaudeMonitor").then((m) => ({ default: m.ClaudeMonitor })),
  { loading: () => <LoadingSkeleton type="monitor" />, ssr: false }
);

const RelationshipGraph = dynamic(
  () => import("@/components/RelationshipGraph").then((m) => ({ default: m.RelationshipGraph })),
  { loading: () => <LoadingSkeleton type="graph" />, ssr: false }
);

const UsageStats = dynamic(
  () => import("@/components/UsageStats").then((m) => ({ default: m.UsageStats })),
  { loading: () => <LoadingSkeleton type="stats" />, ssr: false }
);

const initialData = projectData as ProjectData;

type Tab = "claude" | "overview" | "graph" | "usage";

const tabMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.1 },
};

export default function Home() {
  const [data, setData] = useState<ProjectData>(initialData);
  const [activeTab, setActiveTab] = useState<Tab>("claude");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [selectedGrowthLevel, setSelectedGrowthLevel] = useState<GrowthLevel | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [, setCommandPaletteOpen] = useState(false);

  // Tab indicator animation refs
  const tabsRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  const { favorites, toggleFavorite, mounted: favoritesMounted } = useFavorites();

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadProjectCatalog = async () => {
      try {
        const response = await fetch("/api/projects-catalog", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as Partial<ProjectData>;
        if (!isMounted) return;
        if (!payload.projects || !payload.categories || !payload.technologies) return;
        setData(payload as ProjectData);
      } catch {
        // Keep static fallback when auto-discovery fails.
      }
    };

    void loadProjectCatalog();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Update tab indicator position
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeButton = tabsRef.current.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    if (activeButton) {
      setIndicatorStyle({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [activeTab]);

  const filteredByFavorites = useMemo(() => {
    if (!showFavoritesOnly) return data.projects;
    return data.projects.filter((p) => favorites.has(p.id));
  }, [data.projects, showFavoritesOnly, favorites]);

  const growthLevelCounts = useMemo(() => {
    const counts = {} as Record<GrowthLevel, number>;
    for (const gl of GROWTH_LEVELS) {
      counts[gl.level] = 0;
    }
    for (const p of filteredByFavorites) {
      const level = (p.growthLevel ?? "seed") as GrowthLevel;
      counts[level]++;
    }
    return counts;
  }, [filteredByFavorites]);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategory((prev) => (category === prev ? null : category));
    setSelectedTech(null);
  }, []);

  const handleTechClick = useCallback((tech: string) => {
    setSelectedTech((prev) => (tech === prev ? null : tech));
    setSelectedCategory(null);
  }, []);

  const handleGrowthLevelClick = useCallback((level: GrowthLevel) => {
    setSelectedGrowthLevel((prev) => (level === prev ? null : level));
  }, []);

  const handleProjectClick = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory(null);
    setSelectedTech(null);
    setSelectedGrowthLevel(null);
  }, []);

  const hasFilters = !!(selectedCategory || selectedTech || selectedGrowthLevel);

  const flagshipCount = useMemo(
    () => data.projects.filter((p) => p.growthLevel === "flagship").length,
    [data.projects]
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "claude", label: "Sessions" },
    { id: "overview", label: "Overview" },
    { id: "graph", label: "Graph" },
    { id: "usage", label: "Usage & Cost" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <CommandPalette
        projects={data.projects}
        categories={data.categories}
        onSelectProject={handleProjectClick}
      />

      {/* Header + Tab nav — sticky as a single block */}
      <div className="sticky top-0 z-40">
        <header className="glass-card border-0 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                Project Portfolio Dashboard
              </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/showcase"
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Showcase
              </Link>
              <SearchTrigger onClick={() => setCommandPaletteOpen(true)} />
              <ThemeToggle />
              <ExportButton projects={data.projects} categories={data.categories} />
            </div>
          </div>
        </header>

        {/* Tab navigation with animated indicator */}
        <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4">
            <nav ref={tabsRef} className="flex gap-1 relative" role="tablist" aria-label="Dashboard sections">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  data-tab={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium text-sm transition-colors relative z-10 ${
                    activeTab === tab.id
                      ? "text-blue-600"
                      : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              {/* Animated underline */}
              <div
                className="absolute bottom-0 h-0.5 bg-blue-500 tab-indicator rounded-full"
                style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
              />
            </nav>
          </div>
        </div>
      </div>

      {activeTab !== "claude" && (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <StaggerContainer className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-6">
                {[
                  { value: data.projects.length, label: "Projects", color: "text-blue-600" },
                  { value: data.projects.filter((p) => p.status === "active").length, label: "Active", color: "text-green-600" },
                  { value: flagshipCount, label: "Flagship", color: "text-amber-600" },
                  { value: Object.keys(data.categories).length, label: "Categories", color: "text-purple-600" },
                  { value: new Set(data.projects.flatMap((p) => p.technologies)).size, label: "Tech", color: "text-orange-600" },
                ].map((stat) => (
                  <StaggerItem key={stat.label}>
                    <div className="flex items-center gap-2">
                      <span className={`text-3xl font-bold ${stat.color} animate-count-up`}>{stat.value}</span>
                      <span className="text-gray-500">{stat.label}</span>
                    </div>
                  </StaggerItem>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {favoritesMounted && (
                  <FavoritesFilter
                    showFavoritesOnly={showFavoritesOnly}
                    onToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    favoritesCount={favorites.size}
                  />
                )}
              </div>
            </StaggerContainer>
            {/* Growth Level Filter */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <GrowthLevelFilter
                selectedLevel={selectedGrowthLevel}
                onSelectLevel={setSelectedGrowthLevel}
                levelCounts={growthLevelCounts}
              />
            </div>
          </div>
        </div>
      )}

      {hasFilters && activeTab !== "claude" && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">Filters:</span>
            {selectedCategory && (
              <span
                className="px-2 py-1 rounded text-xs text-white flex items-center gap-1"
                style={{ backgroundColor: data.categories[selectedCategory]?.color }}
              >
                {data.categories[selectedCategory]?.name}
                <button onClick={() => setSelectedCategory(null)} className="hover:bg-white/20 rounded-full p-0.5">×</button>
              </span>
            )}
            {selectedTech && (
              <span className="px-2 py-1 rounded text-xs bg-blue-500 text-white flex items-center gap-1">
                {selectedTech}
                <button onClick={() => setSelectedTech(null)} className="hover:bg-white/20 rounded-full p-0.5">×</button>
              </span>
            )}
            {selectedGrowthLevel && (
              <span
                className="px-2 py-1 rounded text-xs text-white flex items-center gap-1"
                style={{ backgroundColor: GROWTH_LEVELS.find((gl) => gl.level === selectedGrowthLevel)?.color }}
              >
                {GROWTH_LEVELS.find((gl) => gl.level === selectedGrowthLevel)?.icon}{" "}
                {GROWTH_LEVELS.find((gl) => gl.level === selectedGrowthLevel)?.labelJa}
                <button onClick={() => setSelectedGrowthLevel(null)} className="hover:bg-white/20 rounded-full p-0.5">×</button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline ml-2">Clear</button>
          </div>
        </div>
      )}

      <main id="main-content" className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="popLayout">
          {activeTab === "claude" && (
            <motion.div key="claude" {...tabMotion}>
              <ErrorBoundary>
                <ClaudeMonitor />
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === "overview" && (
            <motion.div key="overview" {...tabMotion}>
              <ErrorBoundary>
                <div className="space-y-6">
                  <CategoryChart
                    projects={filteredByFavorites}
                    categories={data.categories}
                    onCategoryClick={handleCategoryClick}
                  />
                  <GrowthLevelChart
                    projects={filteredByFavorites}
                    onGrowthLevelClick={handleGrowthLevelClick}
                  />
                  <TechChart projects={filteredByFavorites} onTechClick={handleTechClick} />
                  <ProjectTable
                    projects={filteredByFavorites}
                    categories={data.categories}
                    selectedCategory={selectedCategory}
                    selectedTech={selectedTech}
                    selectedGrowthLevel={selectedGrowthLevel}
                    onProjectClick={handleProjectClick}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === "graph" && (
            <motion.div key="graph" {...tabMotion}>
              <ErrorBoundary>
                <RelationshipGraph
                  projects={filteredByFavorites}
                  categories={data.categories}
                  onProjectClick={handleProjectClick}
                />
              </ErrorBoundary>
            </motion.div>
          )}

          {activeTab === "usage" && (
            <motion.div key="usage" {...tabMotion}>
              <ErrorBoundary>
                <UsageStats />
              </ErrorBoundary>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <DetailPanel
        project={selectedProject}
        categories={data.categories}
        allProjects={data.projects}
        onClose={() => setSelectedProject(null)}
        onProjectClick={handleProjectClick}
      />

      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          Project Portfolio Dashboard
        </div>
      </footer>
    </div>
  );
}
