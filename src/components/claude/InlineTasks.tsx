"use client";

interface Todo {
  content: string;
  status: "completed" | "in_progress" | "pending";
  activeForm?: string;
}

interface InlineTasksProps {
  todos: Todo[];
  maxDisplay?: number;
}

export function InlineTasks({ todos, maxDisplay = 5 }: InlineTasksProps) {
  if (!todos || todos.length === 0) {
    return null;
  }

  const displayTodos = todos.slice(0, maxDisplay);
  const remaining = todos.length - maxDisplay;

  const completed = todos.filter((t) => t.status === "completed").length;
  const inProgress = todos.filter((t) => t.status === "in_progress").length;
  const total = todos.length;

  // Determine overall status icon
  let statusIcon = "⏳";
  let statusColor = "text-gray-400";
  if (inProgress > 0) {
    statusIcon = "🔄";
    statusColor = "text-blue-500";
  }
  if (completed === total && total > 0) {
    statusIcon = "✅";
    statusColor = "text-green-500";
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      {/* Summary */}
      <div className="flex items-center gap-2 mb-1">
        <span className={statusColor}>{statusIcon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {completed}/{total} 完了
        </span>
      </div>

      {/* Task list */}
      <ul className="space-y-1">
        {displayTodos.map((todo, index) => (
          <li key={index} className="flex items-start gap-1.5 text-xs">
            <span className="mt-0.5 flex-shrink-0">
              {todo.status === "completed" && (
                <span className="text-green-500">✓</span>
              )}
              {todo.status === "in_progress" && (
                <span className="text-blue-500 animate-pulse">●</span>
              )}
              {todo.status === "pending" && (
                <span className="text-gray-300 dark:text-gray-600">○</span>
              )}
            </span>
            <span
              className={`${
                todo.status === "completed"
                  ? "text-gray-400 dark:text-gray-500 line-through"
                  : todo.status === "in_progress"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {todo.status === "in_progress" && todo.activeForm
                ? todo.activeForm
                : todo.content}
            </span>
          </li>
        ))}
        {remaining > 0 && (
          <li className="text-xs text-gray-400 dark:text-gray-500 pl-4">
            +{remaining} more...
          </li>
        )}
      </ul>
    </div>
  );
}
