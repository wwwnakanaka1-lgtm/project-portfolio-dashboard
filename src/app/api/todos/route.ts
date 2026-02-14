import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { getCachedSync } from "@/lib/api-cache";

// Cache TTL - 10 seconds for todos (needs to be fresh but not too expensive)
const TODOS_CACHE_TTL = 10000;

interface Todo {
  content: string;
  status: "completed" | "in_progress" | "pending";
  activeForm?: string;
}

interface SessionTodos {
  sessionId: string;
  todos: Todo[];
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
}

const SESSION_LOG_SCAN_BYTES = 2 * 1024 * 1024; // 2MB tail scan
const SESSION_LOG_SCAN_BYTES_FALLBACK = 8 * 1024 * 1024; // 8MB fallback scan

// Get todos directory
function getTodosDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, ".claude", "todos");
}

function normalizeTodoStatus(status: unknown): Todo["status"] {
  const value = String(status ?? "").trim().toLowerCase();
  if (value === "completed" || value === "complete" || value === "done" || value === "finished") {
    return "completed";
  }
  if (
    value === "in_progress" ||
    value === "in-progress" ||
    value === "inprogress" ||
    value === "active" ||
    value === "working"
  ) {
    return "in_progress";
  }
  return "pending";
}

function normalizeTodo(raw: unknown): Todo | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const value = raw as Record<string, unknown>;
  const content =
    typeof value.content === "string" && value.content.trim()
      ? value.content.trim()
      : typeof value.activeForm === "string" && value.activeForm.trim()
      ? value.activeForm.trim()
      : "";

  if (!content) {
    return null;
  }

  const activeForm =
    typeof value.activeForm === "string" && value.activeForm.trim() ? value.activeForm.trim() : undefined;

  return {
    content,
    status: normalizeTodoStatus(value.status),
    ...(activeForm ? { activeForm } : {}),
  };
}

function normalizeTodoList(rawTodos: unknown): Todo[] {
  if (!Array.isArray(rawTodos)) {
    return [];
  }

  const todoMap = new Map<string, Todo>();
  for (const rawTodo of rawTodos) {
    const todo = normalizeTodo(rawTodo);
    if (!todo) {
      continue;
    }
    const key = `${todo.content.toLowerCase()}||${(todo.activeForm ?? "").toLowerCase()}`;
    todoMap.set(key, todo);
  }

  return Array.from(todoMap.values());
}

function readFileTail(filePath: string, maxBytes: number): string {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size <= 0) {
      return "";
    }

    const bytesToRead = Math.min(stat.size, maxBytes);
    const buffer = Buffer.alloc(bytesToRead);
    const fd = fs.openSync(filePath, "r");
    try {
      fs.readSync(fd, buffer, 0, bytesToRead, stat.size - bytesToRead);
    } finally {
      fs.closeSync(fd);
    }

    return buffer.toString("utf8");
  } catch {
    return "";
  }
}

function findSessionJsonlPath(sessionId: string): string | null {
  const homeDir = os.homedir();
  const projectsRoot = path.join(homeDir, ".claude", "projects");
  if (!fs.existsSync(projectsRoot)) {
    return null;
  }

  const preferredRoots = ["C--Users-wwwhi", "c--Users-wwwhi"].map((dir) =>
    path.join(projectsRoot, dir)
  );

  for (const root of preferredRoots) {
    const candidate = path.join(root, `${sessionId}.jsonl`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const roots = fs.readdirSync(projectsRoot, { withFileTypes: true });
    for (const root of roots) {
      if (!root.isDirectory()) {
        continue;
      }
      const candidate = path.join(projectsRoot, root.name, `${sessionId}.jsonl`);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function extractLatestTodosFromJsonLines(lines: string[]): Todo[] {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim();
    if (!line) {
      continue;
    }

    try {
      const entry = JSON.parse(line) as Record<string, unknown>;

      const toolUseResult = entry.toolUseResult as Record<string, unknown> | undefined;
      if (toolUseResult && Array.isArray(toolUseResult.newTodos)) {
        const todos = normalizeTodoList(toolUseResult.newTodos);
        if (todos.length > 0) {
          return todos;
        }
      }

      const message = entry.message as Record<string, unknown> | undefined;
      const messageContent = message?.content;
      if (Array.isArray(messageContent)) {
        for (let j = messageContent.length - 1; j >= 0; j -= 1) {
          const item = messageContent[j] as Record<string, unknown>;
          if (item?.type !== "tool_use" || item?.name !== "TodoWrite") {
            continue;
          }
          const input = item.input as Record<string, unknown> | undefined;
          if (Array.isArray(input?.todos)) {
            const todos = normalizeTodoList(input.todos);
            if (todos.length > 0) {
              return todos;
            }
          }
        }
      }

      if (Array.isArray(entry.todos)) {
        const todos = normalizeTodoList(entry.todos);
        if (todos.length > 0) {
          return todos;
        }
      }
    } catch {
      // Skip invalid JSON lines
    }
  }

  return [];
}

function readTodosFromSessionLogUncached(sessionId: string): Todo[] {
  const sessionPath = findSessionJsonlPath(sessionId);
  if (!sessionPath) {
    return [];
  }

  const tail = readFileTail(sessionPath, SESSION_LOG_SCAN_BYTES);
  if (tail) {
    const todos = extractLatestTodosFromJsonLines(tail.split(/\r?\n/));
    if (todos.length > 0) {
      return todos;
    }
  }

  const fallbackTail = readFileTail(sessionPath, SESSION_LOG_SCAN_BYTES_FALLBACK);
  if (fallbackTail) {
    return extractLatestTodosFromJsonLines(fallbackTail.split(/\r?\n/));
  }

  return [];
}

function readTodosFromSessionLog(sessionId: string): Todo[] {
  return getCachedSync(`session-log-todos:${sessionId}`, TODOS_CACHE_TTL, () =>
    readTodosFromSessionLogUncached(sessionId)
  );
}

// Read todos for a specific session (merge all matching files)
function readTodosForSessionUncached(sessionId: string): Todo[] {
  const todosDir = getTodosDir();

  if (!fs.existsSync(todosDir)) {
    return readTodosFromSessionLog(sessionId);
  }

  try {
    const files = fs.readdirSync(todosDir, { withFileTypes: true });
    // Find ALL files matching sessionId pattern
    const matchingFiles = files
      .filter((entry) => entry.isFile() && entry.name.startsWith(sessionId))
      .map((entry) => {
        const fullPath = path.join(todosDir, entry.name);
        const stats = fs.statSync(fullPath);
        return {
          name: entry.name,
          fullPath,
          modified: stats.mtime.getTime(),
        };
      })
      .sort((a, b) => a.modified - b.modified || a.name.localeCompare(b.name));

    if (matchingFiles.length === 0) {
      return readTodosFromSessionLog(sessionId);
    }

    // Merge snapshots chronologically so newer snapshots override older ones
    const allTodos = new Map<string, Todo>();

    for (const file of matchingFiles) {
      try {
        const data = fs.readFileSync(file.fullPath, "utf8");
        const todos = normalizeTodoList(JSON.parse(data));

        for (const todo of todos) {
          const key = `${todo.content.toLowerCase()}||${(todo.activeForm ?? "").toLowerCase()}`;
          allTodos.set(key, todo);
        }
      } catch {
        // Skip invalid files
      }
    }

    const todosFromFiles = Array.from(allTodos.values());
    const todosFromSessionLog = readTodosFromSessionLog(sessionId);

    // Session JSONL keeps the latest TodoWrite state and is more reliable when files are stale.
    if (todosFromSessionLog.length > 0) {
      return todosFromSessionLog;
    }

    return todosFromFiles;
  } catch {
    return readTodosFromSessionLog(sessionId);
  }
}

function readTodosForSession(sessionId: string): Todo[] {
  return getCachedSync(`todos-session:${sessionId}`, TODOS_CACHE_TTL, () =>
    readTodosForSessionUncached(sessionId)
  );
}

// Read all todos (for overview) - with caching
function readAllTodos(): SessionTodos[] {
  return getCachedSync("all-todos", TODOS_CACHE_TTL, readAllTodosUncached);
}

function readAllTodosUncached(): SessionTodos[] {
  const todosDir = getTodosDir();

  if (!fs.existsSync(todosDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(todosDir);
    const allTodos: SessionTodos[] = [];
    const seenSessionIds = new Set<string>();

    // Process files in reverse order (newest first), limit to last 100
    const sortedFiles = files.sort().reverse().slice(0, 100);

    for (const file of sortedFiles) {
      try {
        const data = fs.readFileSync(path.join(todosDir, file), "utf8");
        const todos: Todo[] = JSON.parse(data);

        if (todos.length > 0) {
          // Extract session ID from filename (format: sessionId-agent-X.json)
          const sessionId = file.split("-agent-")[0];

          // Skip if we already processed this session
          if (seenSessionIds.has(sessionId)) continue;
          seenSessionIds.add(sessionId);

          // Get merged todos for this session
          const mergedTodos = readTodosForSession(sessionId);

          allTodos.push({
            sessionId,
            todos: mergedTodos,
            stats: {
              total: mergedTodos.length,
              completed: mergedTodos.filter((t) => t.status === "completed").length,
              inProgress: mergedTodos.filter((t) => t.status === "in_progress").length,
              pending: mergedTodos.filter((t) => t.status === "pending").length,
            },
          });
        }
      } catch {
        // Skip invalid files
      }
    }

    return allTodos;
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (sessionId) {
      // Get todos for specific session
      const todos = readTodosForSession(sessionId);
      return NextResponse.json({
        sessionId,
        todos,
        stats: {
          total: todos.length,
          completed: todos.filter((t) => t.status === "completed").length,
          inProgress: todos.filter((t) => t.status === "in_progress").length,
          pending: todos.filter((t) => t.status === "pending").length,
        },
      });
    } else {
      // Get all todos
      const allTodos = readAllTodos();

      // Calculate global stats
      const globalStats = {
        totalSessions: allTodos.length,
        totalTodos: allTodos.reduce((sum, s) => sum + s.stats.total, 0),
        totalCompleted: allTodos.reduce((sum, s) => sum + s.stats.completed, 0),
        totalInProgress: allTodos.reduce((sum, s) => sum + s.stats.inProgress, 0),
        totalPending: allTodos.reduce((sum, s) => sum + s.stats.pending, 0),
      };

      return NextResponse.json({
        sessions: allTodos,
        globalStats,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos", details: String(error) },
      { status: 500 }
    );
  }
}
