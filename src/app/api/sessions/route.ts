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
      totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens,
    };
  } catch {
    return null;
  }
}

// Calculate estimated cost (USD)
function calculateCost(tokens: TokenUsage, model: string = "claude-opus-4-5-20251101"): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["claude-opus-4-5-20251101"];

  const inputCost = (tokens.inputTokens / 1e6) * pricing.input;
  const outputCost = (tokens.outputTokens / 1e6) * pricing.output;
  const cacheReadCost = (tokens.cacheReadTokens / 1e6) * pricing.cacheRead;
  const cacheCreateCost = (tokens.cacheCreationTokens / 1e6) * pricing.cacheCreate;

  return inputCost + outputCost + cacheReadCost + cacheCreateCost;
}

// Find unindexed sessions (directories with JSONL that aren't in sessions-index.json)
function findUnindexedSessions(projectsDir: string, indexedSessionIds: Set<string>): FormattedSession[] {
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

      // Read first user prompt and count messages
      try {
        const content = fs.readFileSync(jsonlFile, "utf8");
        const lines = content.trim().split("\n");
        for (const line of lines) {
          try {
            const jsonEntry = JSON.parse(line);
            if (jsonEntry.type === "user" && jsonEntry.message?.content && !firstPrompt) {
              firstPrompt = jsonEntry.message.content.substring(0, 200);
            }
            if (jsonEntry.type === "user" || jsonEntry.type === "assistant") {
              messageCount++;
            }
          } catch {}
        }
      } catch {}

      const stats = fs.statSync(jsonlFile);
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

// Read and format sessions
function readSessions(): FormattedSession[] {
  try {
    const sessionsFile = findSessionsFile();
    const projectsDir = path.dirname(sessionsFile);

    if (!fs.existsSync(sessionsFile)) {
      return [];
    }

    const data = fs.readFileSync(sessionsFile, "utf8");
    const parsed = JSON.parse(data);
    const entries: SessionEntry[] = parsed.entries || [];

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

        const stats = fs.statSync(jsonlPath);
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
    const unindexedSessions = findUnindexedSessions(projectsDir, indexedSessionIds);

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
