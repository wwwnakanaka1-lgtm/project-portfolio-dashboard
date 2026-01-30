import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

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

// Get todos directory
function getTodosDir(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, ".claude", "todos");
}

// Read todos for a specific session (merge all matching files)
function readTodosForSession(sessionId: string): Todo[] {
  const todosDir = getTodosDir();

  if (!fs.existsSync(todosDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(todosDir);
    // Find ALL files matching sessionId pattern
    const matchingFiles = files.filter((f) => f.startsWith(sessionId));

    if (matchingFiles.length === 0) {
      return [];
    }

    // Collect all todos from matching files, deduplicate by content
    const allTodos = new Map<string, Todo>();

    for (const file of matchingFiles) {
      try {
        const data = fs.readFileSync(path.join(todosDir, file), "utf8");
        const todos: Todo[] = JSON.parse(data);

        for (const todo of todos) {
          // Use content as key to avoid duplicates
          const key = todo.content || todo.activeForm || "";
          if (key && (!allTodos.has(key) || todo.status !== "pending")) {
            // Prefer non-pending status (completed > in_progress > pending)
            allTodos.set(key, todo);
          }
        }
      } catch {
        // Skip invalid files
      }
    }

    return Array.from(allTodos.values());
  } catch {
    return [];
  }
}

// Read all todos (for overview)
function readAllTodos(): SessionTodos[] {
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
