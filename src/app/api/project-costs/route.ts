import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

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

// Find sessions-index.json path
function findSessionsFile(): string {
  const homeDir = os.homedir();
  const baseDir = path.join(homeDir, ".claude", "projects");
  const variations = ["C--Users-wwwhi", "c--Users-wwwhi"];

  for (const dir of variations) {
    const filePath = path.join(baseDir, dir, "sessions-index.json");
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return path.join(baseDir, "C--Users-wwwhi", "sessions-index.json");
}

// Parse JSONL file to get token usage
function getSessionTokenUsage(jsonlPath: string): TokenUsage | null {
  try {
    const content = fs.readFileSync(jsonlPath, "utf8");
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
      inputTokens,
      outputTokens,
      cacheReadTokens,
      cacheCreationTokens,
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

export async function GET() {
  try {
    const sessionsFile = findSessionsFile();

    if (!fs.existsSync(sessionsFile)) {
      return NextResponse.json({ costs: [], error: "Sessions file not found" });
    }

    const sessionsData = JSON.parse(fs.readFileSync(sessionsFile, "utf8"));
    const sessions = sessionsData.sessions || [];

    // Group sessions by projectPath
    const projectCosts = new Map<string, {
      totalCost: number;
      sessionCount: number;
      totalTokens: number;
      lastUsed: string;
    }>();

    for (const session of sessions) {
      if (!session.projectPath) continue;

      const jsonlPath = session.fullPath;
      if (!jsonlPath || !fs.existsSync(jsonlPath)) continue;

      const tokenUsage = getSessionTokenUsage(jsonlPath);
      if (!tokenUsage) continue;

      const cost = calculateCost(tokenUsage);
      const totalTokens = tokenUsage.inputTokens + tokenUsage.outputTokens +
        tokenUsage.cacheReadTokens + tokenUsage.cacheCreationTokens;

      const existing = projectCosts.get(session.projectPath) || {
        totalCost: 0,
        sessionCount: 0,
        totalTokens: 0,
        lastUsed: session.modified || session.created,
      };

      existing.totalCost += cost;
      existing.sessionCount += 1;
      existing.totalTokens += totalTokens;

      // Update lastUsed if this session is more recent
      if (session.modified && session.modified > existing.lastUsed) {
        existing.lastUsed = session.modified;
      }

      projectCosts.set(session.projectPath, existing);
    }

    // Convert to array and extract project names
    const costs: ProjectCost[] = Array.from(projectCosts.entries()).map(
      ([projectPath, data]) => ({
        projectPath,
        projectName: projectPath.split(/[/\\]/).pop() || projectPath,
        totalCost: data.totalCost,
        sessionCount: data.sessionCount,
        totalTokens: data.totalTokens,
        lastUsed: data.lastUsed,
      })
    );

    // Sort by cost (highest first)
    costs.sort((a, b) => b.totalCost - a.totalCost);

    return NextResponse.json({
      costs,
      totalCost: costs.reduce((sum, c) => sum + c.totalCost, 0),
      totalProjects: costs.length,
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
