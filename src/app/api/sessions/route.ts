import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getCachedSync } from "@/lib/api-cache";
import { getClaudeFileData, getFileStats } from "@/lib/file-cache";
import { getClaudeProjectDir, getSessionsIndex } from "@/lib/file-discovery";
import { calculateCost as calculateCostFromPricing } from "@/lib/usage-types";

// Cache TTLs
const SESSIONS_CACHE_TTL = 15000; // 15 seconds (SWR handles interim)
const UNINDEXED_CACHE_TTL = 60000; // 60 seconds for unindexed session scan (expensive)

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
}

interface SessionEntry {
  sessionId: string;
  fullPath: string;
  firstPrompt?: string;
  messageCount: number;
  created: string;
  modified: string;
  projectPath?: string;
}

interface FormattedSession {
  id: string;
  name: string;
  messageCount: number;
  created: string;
  modified: string;
  projectPath?: string;
  status: "active" | "recent" | "past";
  minutesAgo: number;
  tokenUsage: TokenUsage | null;
  estimatedCost: number;
  isUnindexed?: boolean;
}

// Find sessions-index.json path
function findSessionsFile(): string | null {
  const projectDir = getClaudeProjectDir();
  if (!projectDir) return null;
  const filePath = path.join(projectDir, "sessions-index.json");
  return fs.existsSync(filePath) ? filePath : null;
}

// Parse JSONL file to get token usage (delegated to file-cache)
function getSessionTokenUsage(jsonlPath: string): TokenUsage | null {
  const data = getClaudeFileData(jsonlPath);
  if (!data) return null;
  if (data.totalTokens === 0) return null;
  return {
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    cacheReadTokens: data.cacheReadTokens,
    cacheCreationTokens: data.cacheCreationTokens,
    totalTokens: data.totalTokens,
  };
}

// Calculate estimated cost (USD) using centralized pricing
function calculateCost(tokens: TokenUsage, model: string = "claude-opus-4-5-20251101"): number {
  return calculateCostFromPricing(tokens, model);
}

// Find unindexed sessions (directories with JSONL that aren't in sessions-index.json)
// This is expensive, so cache it for longer
function findUnindexedSessions(projectsDir: string, indexedSessionIds: Set<string>): FormattedSession[] {
  const cacheKey = `unindexed-sessions:${projectsDir}`;

  return getCachedSync(cacheKey, UNINDEXED_CACHE_TTL, () => {
    return findUnindexedSessionsUncached(projectsDir, indexedSessionIds);
  });
}

function findUnindexedSessionsUncached(projectsDir: string, indexedSessionIds: Set<string>): FormattedSession[] {
  const unindexedSessions: FormattedSession[] = [];

  try {
    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories and non-UUID-like names
      if (!entry.isDirectory()) continue;
      if (!entry.name.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i)) continue;

      const sessionId = entry.name;
      if (indexedSessionIds.has(sessionId)) continue;

      const sessionDir = path.join(projectsDir, sessionId);

      // Look for JSONL files
      let jsonlFile: string | null = null;
      let latestMtime: Date | null = null;
      let firstPrompt: string | null = null;
      let messageCount = 0;

      // Check for main JSONL file at projects level
      const mainJsonl = path.join(projectsDir, `${sessionId}.jsonl`);
      if (fs.existsSync(mainJsonl)) {
        const mainStats = fs.statSync(mainJsonl);
        jsonlFile = mainJsonl;
        latestMtime = mainStats.mtime;
      }

      // Check inside session directory
      const altMainJsonl = path.join(sessionDir, `${sessionId}.jsonl`);
      if (fs.existsSync(altMainJsonl)) {
        const altStats = fs.statSync(altMainJsonl);
        if (!latestMtime || altStats.mtime > latestMtime) {
          jsonlFile = altMainJsonl;
          latestMtime = altStats.mtime;
        }
      }

      // Check subagents directory
      const subagentsDir = path.join(sessionDir, "subagents");
      if (fs.existsSync(subagentsDir)) {
        const subagentFiles = fs.readdirSync(subagentsDir).filter((f) => f.endsWith(".jsonl"));
        for (const sf of subagentFiles) {
          const sfPath = path.join(subagentsDir, sf);
          const stats = fs.statSync(sfPath);
          if (!latestMtime || stats.mtime > latestMtime) {
            latestMtime = stats.mtime;
            jsonlFile = sfPath;
          }
        }
      }

      if (!jsonlFile) continue;

      // Use file-cache: single read, no duplicate I/O
      const fileData = getClaudeFileData(jsonlFile);
      if (fileData) {
        firstPrompt = fileData.firstUserPrompt;
        messageCount = fileData.messageCount;
      }

      const stats = getFileStats(jsonlFile);
      if (!stats) continue;
      const tokenUsage = getSessionTokenUsage(jsonlFile);
      const cost = tokenUsage ? calculateCost(tokenUsage) : 0;

      const modifiedTime = stats.mtime.getTime();
      const now = Date.now();
      const minutesAgo = (now - modifiedTime) / 1000 / 60;

      let status: "active" | "recent" | "past" = "past";
      if (minutesAgo < 5) {
        status = "active";
      } else if (minutesAgo < 60) {
        status = "recent";
      }

      // Clean up name
      let name = firstPrompt || "Subagent Session";
      name = name.replace(/<[^>]+>/g, "").trim();
      if (name.length > 100) {
        name = name.substring(0, 100) + "...";
      }
      if (name === "" || name === "No prompt") {
        name = "Untitled Session";
      }

      unindexedSessions.push({
        id: sessionId,
        name,
        messageCount: Math.floor(messageCount / 2),
        created: stats.birthtime?.toISOString() || stats.mtime.toISOString(),
        modified: stats.mtime.toISOString(),
        status,
        minutesAgo: Math.round(minutesAgo),
        tokenUsage,
        estimatedCost: cost,
        isUnindexed: true,
      });
    }
  } catch (err) {
    console.error("Error finding unindexed sessions:", err);
  }

  return unindexedSessions;
}

// Read and format sessions (with caching)
function readSessions(): FormattedSession[] {
  return getCachedSync("sessions-list", SESSIONS_CACHE_TTL, readSessionsUncached);
}

function readSessionsUncached(): FormattedSession[] {
  try {
    const projectDir = getClaudeProjectDir();
    if (!projectDir) return [];

    const entries = getSessionsIndex();
    if (entries.length === 0 && !fs.existsSync(path.join(projectDir, "sessions-index.json"))) {
      return [];
    }

    // Track indexed session IDs
    const indexedSessionIds = new Set(entries.map((e) => e.sessionId));

    // Process indexed sessions
    const indexedSessions: FormattedSession[] = entries.map((entry) => {
      try {
        // Normalize path for Windows (handle case variations)
        let jsonlPath = entry.fullPath;
        if (!fs.existsSync(jsonlPath)) {
          jsonlPath = jsonlPath.replace(/c--Users-wwwhi/i, "C--Users-wwwhi");
        }

        const stats = getFileStats(jsonlPath);
        if (!stats) throw new Error("File not found");
        const tokenUsage = getSessionTokenUsage(jsonlPath);
        const cost = tokenUsage ? calculateCost(tokenUsage) : 0;

        const modifiedTime = stats.mtime.getTime();
        const now = Date.now();
        const minutesAgo = (now - modifiedTime) / 1000 / 60;

        let status: "active" | "recent" | "past" = "past";
        if (minutesAgo < 5) {
          status = "active";
        } else if (minutesAgo < 60) {
          status = "recent";
        }

        // Clean up name
        let name = entry.firstPrompt || "No prompt";
        name = name.replace(/<[^>]+>/g, "").trim();
        if (name.length > 100) {
          name = name.substring(0, 100) + "...";
        }
        if (name === "" || name === "No prompt") {
          name = "Untitled Session";
        }

        return {
          id: entry.sessionId,
          name,
          messageCount: entry.messageCount,
          created: entry.created,
          modified: stats.mtime.toISOString(),
          projectPath: entry.projectPath,
          status,
          minutesAgo: Math.round(minutesAgo),
          tokenUsage,
          estimatedCost: cost,
        };
      } catch {
        const minutesAgo = (Date.now() - new Date(entry.modified).getTime()) / 1000 / 60;

        let name = entry.firstPrompt || "No prompt";
        name = name.replace(/<[^>]+>/g, "").trim();
        if (name.length > 100) {
          name = name.substring(0, 100) + "...";
        }

        return {
          id: entry.sessionId,
          name,
          messageCount: entry.messageCount,
          created: entry.created,
          modified: entry.modified,
          projectPath: entry.projectPath,
          status: "past" as const,
          minutesAgo: Math.round(minutesAgo),
          tokenUsage: null,
          estimatedCost: 0,
        };
      }
    });

    // Find and add unindexed sessions
    const unindexedSessions = findUnindexedSessions(projectDir, indexedSessionIds);

    // Combine and sort by modified time (newest first)
    const allSessions = [...indexedSessions, ...unindexedSessions];
    allSessions.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return allSessions;
  } catch (err) {
    console.error("Error reading sessions:", err);
    return [];
  }
}

export async function GET() {
  try {
    const sessions = readSessions();

    // Group sessions by status
    const active = sessions.filter((s) => s.status === "active");
    const recent = sessions.filter((s) => s.status === "recent");
    const past = sessions.filter((s) => s.status === "past");

    // Calculate totals
    const totalCost = sessions.reduce((sum, s) => sum + s.estimatedCost, 0);
    const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);

    return NextResponse.json({
      sessions,
      grouped: {
        active,
        recent,
        past,
      },
      summary: {
        totalSessions: sessions.length,
        activeSessions: active.length,
        recentSessions: recent.length,
        totalCost: Math.round(totalCost * 100) / 100,
        totalMessages,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions", details: String(error) },
      { status: 500 }
    );
  }
}
