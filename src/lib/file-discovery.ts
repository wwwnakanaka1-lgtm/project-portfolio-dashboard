/**
 * Shared file discovery layer.
 *
 * Multiple API routes independently scan directories to find JSONL files.
 * This module centralises those scans with caching so that the filesystem
 * is only walked once per TTL window regardless of how many routes request
 * the file list.
 *
 * Used by: sessions, usage-stats, codex-sessions, plan-usage routes.
 */

import fs from "fs";
import path from "path";
import os from "os";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  firstPrompt?: string;
  messageCount: number;
  created: string;
  modified: string;
  projectPath?: string;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const DISCOVERY_CACHE_TTL = 30_000; // 30 seconds

interface DiscoveryCache<T> {
  data: T;
  timestamp: number;
}

const discoveryCache = new Map<string, DiscoveryCache<unknown>>();

function getCachedDiscovery<T>(key: string, getter: () => T): T {
  const now = Date.now();
  const cached = discoveryCache.get(key) as DiscoveryCache<T> | undefined;
  if (cached && now - cached.timestamp < DISCOVERY_CACHE_TTL) {
    return cached.data;
  }
  const data = getter();
  discoveryCache.set(key, { data, timestamp: now });
  return data;
}

// ---------------------------------------------------------------------------
// Claude project directory
// ---------------------------------------------------------------------------

/**
 * Find the correct Claude project directory (handles case variations on Windows).
 */
export function getClaudeProjectDir(): string | null {
  return getCachedDiscovery("claude-project-dir", () => {
    const projectsDir = path.join(os.homedir(), ".claude", "projects");
    const candidates = ["C--Users-wwwhi", "c--Users-wwwhi"];
    for (const candidate of candidates) {
      const dir = path.join(projectsDir, candidate);
      if (fs.existsSync(dir)) {
        return dir;
      }
    }
    return null;
  });
}

// ---------------------------------------------------------------------------
// Sessions index
// ---------------------------------------------------------------------------

let sessionsIndexCache: { mtimeMs: number; entries: SessionIndexEntry[] } | null = null;

/**
 * Read sessions-index.json with mtime-based cache invalidation.
 */
export function getSessionsIndex(): SessionIndexEntry[] {
  const projectDir = getClaudeProjectDir();
  if (!projectDir) return [];

  const indexPath = path.join(projectDir, "sessions-index.json");
  if (!fs.existsSync(indexPath)) return [];

  try {
    const stats = fs.statSync(indexPath);
    if (sessionsIndexCache && sessionsIndexCache.mtimeMs === stats.mtimeMs) {
      return sessionsIndexCache.entries;
    }

    const data = fs.readFileSync(indexPath, "utf8");
    const parsed = JSON.parse(data);
    const entries: SessionIndexEntry[] = parsed.entries || [];
    sessionsIndexCache = { mtimeMs: stats.mtimeMs, entries };
    return entries;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Claude JSONL files
// ---------------------------------------------------------------------------

/**
 * List all Claude JSONL files (from sessions-index + directory scan).
 * Cached for 30 seconds. Deduplicates by normalized lowercase path.
 */
export function getClaudeJsonlFiles(): string[] {
  return getCachedDiscovery("claude-jsonl-files", () => {
    const projectDir = getClaudeProjectDir();
    if (!projectDir) return [];

    const filesMap = new Map<string, string>();

    // From sessions-index.json
    const entries = getSessionsIndex();
    for (const entry of entries) {
      addUniquePath(filesMap, entry.fullPath);
    }

    // From directory listing
    try {
      for (const fileName of fs.readdirSync(projectDir)) {
        if (fileName.endsWith(".jsonl")) {
          addUniquePath(filesMap, path.join(projectDir, fileName));
        }
      }
    } catch {
      // Ignore directory read errors
    }

    return Array.from(filesMap.values());
  });
}

// ---------------------------------------------------------------------------
// Codex JSONL files
// ---------------------------------------------------------------------------

/**
 * Get the Codex sessions root directory.
 */
export function getCodexSessionsRoot(): string {
  return path.join(os.homedir(), ".codex", "sessions");
}

/**
 * List all Codex JSONL files (recursive walk, max 2000 files).
 * Cached for 30 seconds.
 */
export function getCodexJsonlFiles(maxFiles: number = 2000): string[] {
  return getCachedDiscovery("codex-jsonl-files", () => {
    const root = getCodexSessionsRoot();
    if (!fs.existsSync(root)) return [];

    const files: string[] = [];
    const stack = [root];

    while (stack.length > 0) {
      const currentDir = stack.pop()!;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }
        if (entry.isFile() && entry.name.endsWith(".jsonl")) {
          files.push(fullPath);
          if (files.length >= maxFiles) {
            return files;
          }
        }
      }
    }

    return files;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizePath(rawPath: string): string | null {
  if (fs.existsSync(rawPath)) {
    return rawPath;
  }
  const candidates = [
    rawPath.replace(/c--Users-wwwhi/i, "C--Users-wwwhi"),
    rawPath.replace(/C--Users-wwwhi/i, "c--Users-wwwhi"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function addUniquePath(filesMap: Map<string, string>, rawPath: string): void {
  const normalized = normalizePath(rawPath);
  if (!normalized) return;
  filesMap.set(normalized.toLowerCase(), normalized);
}
