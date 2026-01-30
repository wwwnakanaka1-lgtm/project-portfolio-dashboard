"use client";

interface ManualTask {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

interface ManualTasksTabProps {
  tasks: ManualTask[];
  onTaskClick: (task: ManualTask) => void;
  onStatusChange: (taskId: string, newStatus: "pending" | "in_progress" | "completed") => void;
}

export function ManualTasksTab({ tasks, onTaskClick, onStatusChange }: ManualTasksTabProps) {
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const pending = tasks.filter((t) => t.status === "pending");
  const completed = tasks.filter((t) => t.status === "completed");

  const completedCount = completed.length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      default:
        return "⏳";
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCardClass = (status: string) => {
    if (status === "in_progress") return "border-green-500 bg-green-50 dark:bg-green-900/20";
    if (status === "completed") return "border-gray-300 dark:border-gray-600 opacity-75";
    return "border-gray-200 dark:border-gray-700";
  };

  const TaskCard = ({ task }: { task: ManualTask }) => (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border ${getCardClass(task.status)} p-4 cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => onTaskClick(task)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900 dark:text-white truncate">
          {getStatusIcon(task.status)} {task.name}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatTime(task.updatedAt)}
        </span>
      </div>
      {task.description && (
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {task.description}
        </div>
      )}
      <div className="flex gap-2">
        {task.status !== "in_progress" && (
          <button
            className="px-3 py-1 text-sm border border-blue-500 text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, "in_progress");
            }}
          >
            開始
          </button>
        )}
        {task.status === "in_progress" && (
          <button
            className="px-3 py-1 text-sm border border-green-500 text-green-500 rounded hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, "completed");
            }}
          >
            完了
          </button>
        )}
        {task.status === "completed" && (
          <button
            className="px-3 py-1 text-sm border border-gray-400 text-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, "pending");
            }}
          >
            再開
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">全体進捗</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{completedCount}/{totalCount} ({progressPercent}%)</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* In Progress */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          進行中
          <span className="text-sm font-normal text-gray-500">({inProgress.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inProgress.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {inProgress.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400 p-4">進行中のタスクはありません</div>
          )}
        </div>
      </section>

      {/* Pending */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          待機中
          <span className="text-sm font-normal text-gray-500">({pending.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {pending.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400 p-4">待機中のタスクはありません</div>
          )}
        </div>
      </section>

      {/* Completed */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          完了
          <span className="text-sm font-normal text-gray-500">({completed.length})</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completed.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {completed.length === 0 && (
            <div className="text-gray-500 dark:text-gray-400 p-4">完了したタスクはありません</div>
          )}
        </div>
      </section>
    </>
  );
}
