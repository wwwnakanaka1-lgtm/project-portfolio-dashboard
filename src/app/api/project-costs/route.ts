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
// Returns null if not in Create folder
function getProjectName(projectPath: string): string | null {
  const parts = projectPath.split(/[/\\]/);
  // Find the part after "Create" if it exists
  const createIndex = parts.findIndex(p => p.toLowerCase() === "create");
  if (createIndex !== -1 && createIndex < parts.length - 1) {
    return parts[createIndex + 1];
  }
  // Not in Create folder - return null to indicate "Uncategorized"
  return null;
}

// Special project name for sessions outside of Create folder
const UNCATEGORIZED_PROJECT = "Uncategorized";

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

// Extract project name from session's firstPrompt or working directory
function extractProjectFromSession(firstPrompt: string | undefined, cwd: string | undefined): string {
  // Try to extract from firstPrompt (IDE opened file paths)
  if (firstPrompt) {
    const match = firstPrompt.match(/Create[/\\]([a-zA-Z0-9_-]+)[/\\]/i);
    if (match) {
      return match[1];
    }
  }
  // Try to extract from working directory
  if (cwd) {
    const match = cwd.match(/Create[/\\]([a-zA-Z0-9_-]+)/i);
    if (match) {
      return match[1];
    }
  }
  return UNCATEGORIZED_PROJECT;
}

// Compute project costs (expensive operation, cached)
// Uses same scanning method as usage-stats for consistency
function computeProjectCosts(): { costs: ProjectCost[]; totalCost: number; totalProjects: number } | { error: string } {
  const homeDir = os.homedir();
  const projectsDir = path.join(homeDir, ".claude", "projects");

  // Find the correct project directory (same as usage-stats)
  const variations = ["C--Users-wwwhi", "c--Users-wwwhi"];
  let projectDir = "";

  for (const dir of variations) {
    const testPath = path.join(projectsDir, dir);
    if (fs.existsSync(testPath)) {
      projectDir = testPath;
      break;
    }
  }

  if (!projectDir) {
    return { error: "Project directory not found" };
  }

  // Read all JSONL files from the main directory only
  const files = fs.readdirSync(projectDir).filter(f => f.endsWith(".jsonl"));

  // Aggregate costs by project
  const projectCosts = new Map<string, {
    totalCost: number;
    sessionCount: number;
    totalTokens: number;
    lastUsed: string;
  }>();

  for (const file of files) {
    // Skip agent files (they're subprocesses, already counted in main session)
    if (file.startsWith("agent-")) continue;

    const jsonlPath = path.join(projectDir, file);
    let content: string;
    try {
      content = fs.readFileSync(jsonlPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n").filter(l => l.trim());
    if (lines.length === 0) continue;

    // Extract project info from first entry
    let projectName = UNCATEGORIZED_PROJECT;
    let sessionDate = "";

    // Look for project info in the session (check more lines for better detection)
    for (const line of lines.slice(0, 20)) {
      try {
        const entry = JSON.parse(line);

        // Try cwd first (most reliable)
        if (entry.cwd && projectName === UNCATEGORIZED_PROJECT) {
          const cwdMatch = entry.cwd.match(/Create[/\\]([a-zA-Z0-9_-]+)/i);
          if (cwdMatch) {
            projectName = cwdMatch[1];
          }
        }

        // Try message content (file paths mentioned)
        if (projectName === UNCATEGORIZED_PROJECT && entry.message?.content) {
          const content = typeof entry.message.content === 'string'
            ? entry.message.content
            : JSON.stringify(entry.message.content);
          const contentMatch = content.match(/Create[/\\]([a-zA-Z0-9_-]+)[/\\]/i);
          if (contentMatch) {
            projectName = contentMatch[1];
          }
        }

        // Try tool results (file paths in tool output)
        if (projectName === UNCATEGORIZED_PROJECT && entry.toolResult) {
          const toolContent = typeof entry.toolResult === 'string'
            ? entry.toolResult
            : JSON.stringify(entry.toolResult);
          const toolMatch = toolContent.match(/Create[/\\]([a-zA-Z0-9_-]+)[/\\]/i);
          if (toolMatch) {
            projectName = toolMatch[1];
          }
        }

        if (!sessionDate && entry.timestamp) {
          sessionDate = entry.timestamp;
        }

        if (projectName !== UNCATEGORIZED_PROJECT) break;
      } catch {
        // Skip invalid JSON
      }
    }

    // Calculate token usage
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

  // Convert to array
  const costs: ProjectCost[] = Array.from(projectCosts.entries()).map(
    ([projectName, data]) => ({
      projectPath: projectName === UNCATEGORIZED_PROJECT
        ? "C:/Users/wwwhi"
        : `C:/Users/wwwhi/Create/${projectName}`,
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
