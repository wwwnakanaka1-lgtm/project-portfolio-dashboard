"use client";

import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { Project, Categories } from "@/lib/types";

interface CommandPaletteProps {
  projects: Project[];
  categories: Categories;
  onSelectProject: (project: Project) => void;
}

export function CommandPalette({
  projects,
  categories,
  onSelectProject,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Toggle the menu when Cmd+K or Ctrl+K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (project: Project) => {
      setOpen(false);
      setSearch("");
      onSelectProject(project);
    },
    [onSelectProject]
  );

  // Filter projects based on search
  const filteredProjects = projects.filter((project) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      project.name.toLowerCase().includes(searchLower) ||
      project.description.toLowerCase().includes(searchLower) ||
      project.technologies.some((tech) =>
        tech.toLowerCase().includes(searchLower)
      )
    );
  });

  // Group projects by category
  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const category = project.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />

      {/* Command Dialog */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <Command
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          shouldFilter={false}
        >
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search projects by name, description, or technology..."
              className="w-full px-4 py-4 text-gray-900 dark:text-white placeholder-gray-400 bg-transparent outline-none"
              autoFocus
            />
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {filteredProjects.length === 0 && (
              <Command.Empty className="py-6 text-center text-gray-500 dark:text-gray-400">
                No projects found.
              </Command.Empty>
            )}

            {Object.entries(groupedProjects).map(([category, categoryProjects]) => (
              <Command.Group
                key={category}
                heading={
                  <span
                    className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded"
                    style={{ color: categories[category]?.color }}
                  >
                    {categories[category]?.name || category}
                  </span>
                }
                className="mb-2"
              >
                {categoryProjects.map((project) => (
                  <Command.Item
                    key={project.id}
                    value={project.id}
                    onSelect={() => handleSelect(project)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: categories[project.category]?.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {project.description}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {project.technologies.slice(0, 2).map((tech) => (
                        <span
                          key={tech}
                          className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-semibold">
                  Enter
                </kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded font-semibold">
                  Esc
                </kbd>
                to close
              </span>
            </div>
            <span>{filteredProjects.length} projects</span>
          </div>
        </Command>
      </div>
    </div>
  );
}

// Search trigger button component
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <span className="hidden sm:inline">Search...</span>
      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-xs font-semibold bg-white dark:bg-gray-600 rounded border border-gray-200 dark:border-gray-500">
        {isMac ? "Cmd" : "Ctrl"}+K
      </kbd>
    </button>
  );
}
