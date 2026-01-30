import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getCachedSync } from "@/lib/api-cache";

// Cache TTL - 60 seconds for project costs (expensive computation)
const PROJECT_COSTS_CACHE_TTL = 60000;

// Pricing per 1M tokens
const MODEL_PRICING = {
  "claude-opus-4-5-20251101": {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheCreate: 18.75,
  },
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheCreate: 3.75,
  },
} as const;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

interface ProjectCost {
  projectPath: string;
  projectName: string;
  totalCost: number;
  sessionCount: number;
  totalTokens: number;
  lastUsed: string;
}

// Convert directory name to project path
// e.g., "c--Users-wwwhi-Create-fukunage-line-bot" -> "c:/Users/wwwhi/Create/fukunage-line-bot"
function dirNameToProjectPath(dirName: string): string {
  // Replace -- with : for drive letter, then - with /
  // But be careful: only the first -- is the drive separator
  let result = dirName;

  // Handle drive letter (first --)
  const driveMatch = result.match(/^([a-zA-Z])--/);
  if (driveMatch) {
    result = driveMatch[1] + ":" + result.substring(3);
  }

  // Replace remaining - with /
  result = result.replace(/-/g, "/");

  return result;
}

// Extract project name from path
// e.g., "c:/Users/wwwhi/Create/fukunage-line-bot" -> "fukunage-line-bot"
function getProjectName(projectPath: string): string {
  const parts = projectPath.split(/[/\\]/);
  // Find the part after "Create" if it exists
  const createIndex = parts.findIndex(p => p.toLowerCase() === "create");
  if (createIndex !== -1 && createIndex < parts.length - 1) {
    return parts[createIndex + 1];
  }
  return parts[parts.length - 1] || projectPath;
}

// Parse JSONL file to get token usage
function getSessionTokenUsage(jsonlPath: string): { usage: TokenUsage; lastModified: string } | null {
  try {
    const stats = fs.statSync(jsonlPath);
    const content = fs.readFileSync(jsonlPath, "utf8");

    if (!content.trim()) return null;

    const lines = content.trim().split("\n");

    let inputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheCreationTokens = 0;

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === "assistant" && entry.message?.usage) {
          const usage = entry.message.usage;
          inputTokens += usage.input_tokens || 0;
          outputTokens += usage.output_tokens || 0;
          cacheReadTokens += usage.cache_read_input_tokens || 0;
          cacheCreationTokens += usage.cache_creation_input_tokens || 0;
        }
      } catch {
        // Skip invalid lines
      }
    }

    return {
      usage: {
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
      },
      lastModified: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

// Calculate cost from token usage
function calculateCost(usage: TokenUsage): number {
  const pricing = MODEL_PRICING["claude-opus-4-5-20251101"];
  const cost =
    (usage.inputTokens / 1_000_000) * pricing.input +
    (usage.outputTokens / 1_000_000) * pricing.output +
    (usage.cacheReadTokens / 1_000_000) * pricing.cacheRead +
    (usage.cacheCreationTokens / 1_000_000) * pricing.cacheCreate;
  return cost;
}

// Compute project costs (expensive operation, cached)
function computeProjectCosts(): { costs: ProjectCost[]; totalCost: number; totalProjects: number } | { error: string } {
  const homeDir = os.homedir();
  const projectsDir = path.join(homeDir, ".claude", "projects");

  if (!fs.existsSync(projectsDir)) {
    return { error: "Projects directory not found" };
  }

  // Get all project directories
  const projectDirs = fs.readdirSync(projectsDir).filter(name => {
    const fullPath = path.join(projectsDir, name);
    try {
      return fs.statSync(fullPath).isDirectory();
    } catch {
      return false;
    }
  });

  // Aggregate costs by project
  const projectCosts = new Map<string, {
    totalCost: number;
    sessionCount: number;
    totalTokens: number;
    lastUsed: string;
  }>();

  for (const dirName of projectDirs) {
    const projectPath = dirNameToProjectPath(dirName);
    const projectName = getProjectName(projectPath);

    // Skip the root user directory (just "c:/Users/wwwhi" or similar)
    if (!projectPath.toLowerCase().includes("/create/")) {
      continue;
    }

    const dirPath = path.join(projectsDir, dirName);

    // Get all JSONL files in this directory
    let files: string[];
    try {
      files = fs.readdirSync(dirPath).filter(f => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    for (const file of files) {
      // Skip agent files (they're subprocesses, already counted in main session)
      if (file.startsWith("agent-")) continue;

      const jsonlPath = path.join(dirPath, file);
      const result = getSessionTokenUsage(jsonlPath);

      if (!result || (result.usage.inputTokens === 0 && result.usage.outputTokens === 0)) {
        continue;
      }

      const cost = calculateCost(result.usage);
      const totalTokens = result.usage.inputTokens + result.usage.outputTokens +
        result.usage.cacheReadTokens + result.usage.cacheCreationTokens;

      const existing = projectCosts.get(projectName) || {
        totalCost: 0,
        sessionCount: 0,
        totalTokens: 0,
        lastUsed: result.lastModified,
      };

      existing.totalCost += cost;
      existing.sessionCount += 1;
      existing.totalTokens += totalTokens;

      if (result.lastModified > existing.lastUsed) {
        existing.lastUsed = result.lastModified;
      }

      projectCosts.set(projectName, existing);
    }
  }

  // Also scan the main sessions-index.json for sessions with specific project paths
  const mainDirs = ["C--Users-wwwhi", "c--Users-wwwhi"];
  for (const mainDir of mainDirs) {
    const sessionsFile = path.join(projectsDir, mainDir, "sessions-index.json");
    if (!fs.existsSync(sessionsFile)) continue;

    try {
      const sessionsData = JSON.parse(fs.readFileSync(sessionsFile, "utf8"));
      const entries = sessionsData.entries || [];

      for (const session of entries) {
        const jsonlPath = session.fullPath;
        if (!jsonlPath || !fs.existsSync(jsonlPath)) continue;

        const result = getSessionTokenUsage(jsonlPath);
        if (!result || (result.usage.inputTokens === 0 && result.usage.outputTokens === 0)) {
          continue;
        }

        // Try to extract project name from firstPrompt (IDE opened file paths)
        let projectName: string | null = null;
        if (session.firstPrompt) {
          const match = session.firstPrompt.match(/Create[/\\]([a-zA-Z0-9_-]+)[/\\]/i);
          if (match) {
            projectName = match[1];
          }
        }

        if (!projectName) continue;

        const cost = calculateCost(result.usage);
        const totalTokens = result.usage.inputTokens + result.usage.outputTokens +
          result.usage.cacheReadTokens + result.usage.cacheCreationTokens;

        const existing = projectCosts.get(projectName) || {
          totalCost: 0,
          sessionCount: 0,
          totalTokens: 0,
          lastUsed: session.modified || session.created || result.lastModified,
        };

        existing.totalCost += cost;
        existing.sessionCount += 1;
        existing.totalTokens += totalTokens;

        const sessionDate = session.modified || session.created || result.lastModified;
        if (sessionDate > existing.lastUsed) {
          existing.lastUsed = sessionDate;
        }

        projectCosts.set(projectName, existing);
      }
    } catch {
      // Skip if error reading sessions file
    }
  }

  // Convert to array
  const costs: ProjectCost[] = Array.from(projectCosts.entries()).map(
    ([projectName, data]) => ({
      projectPath: `C:/Users/wwwhi/Create/${projectName}`,
      projectName,
      totalCost: data.totalCost,
      sessionCount: data.sessionCount,
      totalTokens: data.totalTokens,
      lastUsed: data.lastUsed,
    })
  );

  // Sort by cost (highest first)
  costs.sort((a, b) => b.totalCost - a.totalCost);

  return {
    costs,
    totalCost: costs.reduce((sum, c) => sum + c.totalCost, 0),
    totalProjects: costs.length,
  };
}

export async function GET() {
  try {
    // Use cached result if available
    const result = getCachedSync("project-costs", PROJECT_COSTS_CACHE_TTL, computeProjectCosts);

    if ("error" in result) {
      return NextResponse.json({ costs: [], error: result.error });
    }

    return NextResponse.json({
      ...result,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error calculating project costs:", error);
    return NextResponse.json(
      { error: "Failed to calculate project costs", details: String(error) },
      { status: 500 }
    );
  }
}
