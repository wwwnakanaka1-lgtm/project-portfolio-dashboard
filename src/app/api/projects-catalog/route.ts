import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import staticProjectData from "@/lib/projects.json";
import { getCachedSync } from "@/lib/api-cache";
import type { Project, ProjectData } from "@/lib/types";

const PROJECT_CATALOG_CACHE_TTL = 30_000;
const DEFAULT_PROJECTS_ROOT = path.join(os.homedir(), "Create");
const PROJECTS_ROOT = process.env.PROJECT_PORTFOLIO_ROOT_DIR || DEFAULT_PROJECTS_ROOT;

const TECH_LIMIT = 6;
const EXCLUDED_NAMES = new Set([
  ".git",
  ".github",
  ".idea",
  ".vscode",
  ".next",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "__pycache__",
  ".venv",
  "venv",
]);

const CATEGORY_RULES: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /(trade|trading|stock|money|finance|invest)/i, category: "finance" },
  { pattern: /(analy|data|dash|chart|graph|report)/i, category: "data-analysis" },
  { pattern: /(claude|codex|gpt|llm|agent|spec|worktree|prompt|orchestration)/i, category: "ai-llm" },
  { pattern: /(bot|crawler|scrape|line)/i, category: "web-bot" },
];

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readText(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function toTitleCase(id: string): string {
  return id
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferCategory(projectId: string): string {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(projectId)) {
      return rule.category;
    }
  }
  return "utility";
}

function inferStatus(projectDir: string): Project["status"] {
  try {
    const entries = fs
      .readdirSync(projectDir, { withFileTypes: true })
      .filter((entry) => !EXCLUDED_NAMES.has(entry.name));
    return entries.length === 0 ? "empty" : "active";
  } catch {
    return "empty";
  }
}

function hasDevScript(packageData: Record<string, unknown> | null): boolean {
  if (!packageData) {
    return false;
  }
  const scripts = packageData.scripts;
  if (!scripts || typeof scripts !== "object") {
    return false;
  }
  return typeof (scripts as Record<string, unknown>).dev === "string";
}

function inferLaunchCommand(projectDir: string): string | undefined {
  const rootPackage = readJson(path.join(projectDir, "package.json"));
  if (hasDevScript(rootPackage)) {
    return "npm run dev";
  }

  const frontendPackage = readJson(path.join(projectDir, "frontend", "package.json"));
  if (hasDevScript(frontendPackage)) {
    return "cd frontend && npm run dev";
  }

  const uiPackage = readJson(path.join(projectDir, "ui", "package.json"));
  if (hasDevScript(uiPackage)) {
    return "cd ui && npm run dev";
  }

  if (fs.existsSync(path.join(projectDir, "start.bat"))) {
    return "start.bat";
  }

  return undefined;
}

function addDependenciesAsTech(tech: Set<string>, deps: Record<string, unknown>): void {
  const depNames = new Set(Object.keys(deps));
  if (depNames.size > 0) {
    tech.add("Node.js");
  }
  if (depNames.has("next")) {
    tech.add("Next.js");
  }
  if (depNames.has("react")) {
    tech.add("React");
  }
  if (depNames.has("typescript")) {
    tech.add("TypeScript");
  }
  if (depNames.has("fastapi")) {
    tech.add("FastAPI");
  }
  if (depNames.has("streamlit")) {
    tech.add("Streamlit");
  }
  if (depNames.has("recharts")) {
    tech.add("Recharts");
  }
}

function detectTechnologies(projectDir: string): string[] {
  const tech = new Set<string>();

  const packageCandidates = [
    path.join(projectDir, "package.json"),
    path.join(projectDir, "frontend", "package.json"),
    path.join(projectDir, "ui", "package.json"),
  ];

  for (const packagePath of packageCandidates) {
    const packageData = readJson(packagePath);
    if (!packageData) {
      continue;
    }
    const dependencies = packageData.dependencies;
    if (dependencies && typeof dependencies === "object") {
      addDependenciesAsTech(tech, dependencies as Record<string, unknown>);
    }
    const devDependencies = packageData.devDependencies;
    if (devDependencies && typeof devDependencies === "object") {
      addDependenciesAsTech(tech, devDependencies as Record<string, unknown>);
    }
  }

  const requirementsCandidates = [
    path.join(projectDir, "requirements.txt"),
    path.join(projectDir, "backend", "requirements.txt"),
  ];
  for (const requirementsPath of requirementsCandidates) {
    const content = readText(requirementsPath).toLowerCase();
    if (!content) {
      continue;
    }
    tech.add("Python");
    if (content.includes("fastapi")) {
      tech.add("FastAPI");
    }
    if (content.includes("streamlit")) {
      tech.add("Streamlit");
    }
    if (content.includes("pandas")) {
      tech.add("pandas");
    }
  }

  const pyprojectCandidates = [
    path.join(projectDir, "pyproject.toml"),
    path.join(projectDir, "backend", "pyproject.toml"),
  ];
  for (const pyprojectPath of pyprojectCandidates) {
    const content = readText(pyprojectPath).toLowerCase();
    if (!content) {
      continue;
    }
    tech.add("Python");
    if (content.includes("fastapi")) {
      tech.add("FastAPI");
    }
    if (content.includes("streamlit")) {
      tech.add("Streamlit");
    }
  }

  if (fs.existsSync(path.join(projectDir, "tsconfig.json"))) {
    tech.add("TypeScript");
  }
  if (fs.existsSync(path.join(projectDir, "frontend", "tsconfig.json"))) {
    tech.add("TypeScript");
  }

  if (tech.size === 0) {
    return [];
  }
  return Array.from(tech).slice(0, TECH_LIMIT);
}

function buildAutoProject(projectId: string): Project {
  const projectDir = path.join(PROJECTS_ROOT, projectId);
  const launchCommand = inferLaunchCommand(projectDir);
  const project: Project = {
    id: projectId,
    name: toTitleCase(projectId),
    category: inferCategory(projectId),
    description: "Auto-discovered from local Create directory",
    path: projectDir.replace(/\\/g, "/"),
    technologies: detectTechnologies(projectDir),
    status: inferStatus(projectDir),
  };
  if (launchCommand) {
    project.launchCommand = launchCommand;
  }
  return project;
}

function buildCatalog(): ProjectData {
  const baseData = staticProjectData as ProjectData;
  if (!fs.existsSync(PROJECTS_ROOT)) {
    return baseData;
  }

  const knownIds = new Set(baseData.projects.map((project) => project.id.toLowerCase()));
  const discoveredProjects = fs
    .readdirSync(PROJECTS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("."))
    .filter((name) => !knownIds.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => buildAutoProject(name));

  if (discoveredProjects.length === 0) {
    return baseData;
  }

  return {
    ...baseData,
    projects: [...baseData.projects, ...discoveredProjects],
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = getCachedSync("projects-catalog", PROJECT_CATALOG_CACHE_TTL, buildCatalog);
    return NextResponse.json(catalog, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to build project catalog",
        details: String(error),
      },
      { status: 500 }
    );
  }
}

