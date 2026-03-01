/**
 * Mtime-based file cache for JSONL files.
 *
 * JSONL session files are append-only during a session. Once a session ends,
 * the file never changes. This cache exploits that property: it validates
 * entries via statSync (mtimeMs + size). If unchanged, the cached parsed
 * lines are returned without any readFileSync or JSON.parse overhead.
 *
 * Used by: sessions, usage-stats, codex-sessions, plan-usage routes.
 */

import fs from "fs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedFile {
  mtimeMs: number;
  size: number;
  lines: unknown[];
}

export interface ClaudeFileData {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalTokens: number;
  messageCount: number;
  userMessageCount: number;
  toolCallCount: number;
  firstUserPrompt: string | null;
  /** ISO timestamps of "user" type entries */
  userTimestamps: number[];
  /** Per-entry model + usage for daily/model aggregation */
  usageEntries: UsageEntry[];
}

export interface UsageEntry {
  model: string;
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

// ---------------------------------------------------------------------------
// Cache store
// ---------------------------------------------------------------------------

const fileCache = new Map<string, CachedFile>();

/**
 * Return parsed JSON lines for a file, using mtime+size for validation.
 * If the file hasn't changed since last read, returns cached lines (no I/O).
 */
export function getCachedFileLines(filePath: string): unknown[] {
  try {
    const stats = fs.statSync(filePath);
    const cached = fileCache.get(filePath);

    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.lines;
    }

    const content = fs.readFileSync(filePath, "utf8");
    const rawLines = content.split("\n").filter((l) => l.trim());
    const lines: unknown[] = [];

    for (const raw of rawLines) {
      try {
        lines.push(JSON.parse(raw));
      } catch {
        // Skip invalid JSON lines
      }
    }

    fileCache.set(filePath, { mtimeMs: stats.mtimeMs, size: stats.size, lines });
    return lines;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Claude-specific extraction
// ---------------------------------------------------------------------------

const claudeDataCache = new Map<string, { mtimeMs: number; size: number; data: ClaudeFileData }>();

/**
 * Extract aggregated data from a Claude session JSONL file.
 * Cached by mtime+size — only re-parses when the file changes.
 */
export function getClaudeFileData(filePath: string): ClaudeFileData | null {
  try {
    const stats = fs.statSync(filePath);
    const cached = claudeDataCache.get(filePath);

    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.data;
    }

    const lines = getCachedFileLines(filePath);
    const data = extractClaudeData(lines);
    claudeDataCache.set(filePath, { mtimeMs: stats.mtimeMs, size: stats.size, data });
    return data;
  } catch {
    return null;
  }
}

function extractClaudeData(lines: unknown[]): ClaudeFileData {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheCreationTokens = 0;
  let messageCount = 0;
  let userMessageCount = 0;
  let toolCallCount = 0;
  let firstUserPrompt: string | null = null;
  const userTimestamps: number[] = [];
  const usageEntries: UsageEntry[] = [];

  for (const line of lines) {
    const entry = line as Record<string, unknown>;
    const entryType = entry.type as string | undefined;
    const message = entry.message as Record<string, unknown> | undefined;
    const timestamp = entry.timestamp as string | undefined;

    if (entryType === "user" || entryType === "assistant") {
      messageCount++;
    }

    if (entryType === "user") {
      userMessageCount++;
      if (timestamp) {
        const ts = Date.parse(timestamp);
        if (!Number.isNaN(ts)) {
          userTimestamps.push(ts);
        }
      }
      if (!firstUserPrompt && message?.content) {
        const content = message.content;
        if (typeof content === "string") {
          firstUserPrompt = content.substring(0, 200);
        }
      }
    }

    // Count tool calls
    if (message?.content && Array.isArray(message.content)) {
      toolCallCount += (message.content as { type: string }[]).filter((c) => c.type === "tool_use").length;
    }

    // Token usage
    if (message?.usage) {
      const u = message.usage as Record<string, number>;
      const model = (message.model as string) || "claude-opus-4-5-20251101";
      const date = timestamp?.split("T")[0] || "";

      const input = u.input_tokens || 0;
      const output = u.output_tokens || 0;
      const cacheRead = u.cache_read_input_tokens || 0;
      const cacheCreate = u.cache_creation_input_tokens || 0;

      inputTokens += input;
      outputTokens += output;
      cacheReadTokens += cacheRead;
      cacheCreationTokens += cacheCreate;

      usageEntries.push({
        model,
        date,
        inputTokens: input,
        outputTokens: output,
        cacheReadTokens: cacheRead,
        cacheCreateTokens: cacheCreate,
      });
    }
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    totalTokens: inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens,
    messageCount,
    userMessageCount,
    toolCallCount,
    firstUserPrompt,
    userTimestamps,
    usageEntries,
  };
}

// ---------------------------------------------------------------------------
// Codex-specific extraction
// ---------------------------------------------------------------------------

const codexDataCache = new Map<string, { mtimeMs: number; size: number; lines: unknown[] }>();

/**
 * Return parsed JSON lines for a Codex session file, cached by mtime+size.
 */
export function getCodexFileLines(filePath: string): unknown[] {
  try {
    const stats = fs.statSync(filePath);
    const cached = codexDataCache.get(filePath);

    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
      return cached.lines;
    }

    const lines = getCachedFileLines(filePath);
    codexDataCache.set(filePath, { mtimeMs: stats.mtimeMs, size: stats.size, lines });
    return lines;
  } catch {
    return [];
  }
}

/**
 * Get file modification time (ms since epoch) without reading the file.
 */
export function getFileMtimeMs(filePath: string): number | null {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Get file stats without reading the file.
 */
export function getFileStats(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}
