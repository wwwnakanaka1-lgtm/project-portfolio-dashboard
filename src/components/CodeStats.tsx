"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface CodeStatsProps {
  stats: {
    lines: number;
    files: number;
    languages: Record<string, number>;
    dependencies: number;
  };
}

// Language colors for the chart
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Rust: "#dea584",
  Go: "#00add8",
  Java: "#b07219",
  CSS: "#563d7c",
  HTML: "#e34c26",
  JSON: "#292929",
  Markdown: "#083fa1",
  YAML: "#cb171e",
  Shell: "#89e051",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
};

const DEFAULT_COLOR = "#6b7280";

export default function CodeStats({ stats }: CodeStatsProps) {
  // Transform languages data for the chart
  const languageData = Object.entries(stats.languages)
    .map(([name, lines]) => ({
      name,
      lines,
      color: LANGUAGE_COLORS[name] || DEFAULT_COLOR,
    }))
    .sort((a, b) => b.lines - a.lines);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <div className="w-full p-4 md:p-6 bg-white dark:bg-gray-900 rounded-xl shadow-lg">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Code Statistics
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {/* Total Lines */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Total Lines
              </p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatNumber(stats.lines)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Files */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                Total Files
              </p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatNumber(stats.files)}
              </p>
            </div>
          </div>
        </div>

        {/* Dependencies */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Dependencies
              </p>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatNumber(stats.dependencies)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Language Distribution Chart */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Lines of Code by Language
        </h3>

        {languageData.length > 0 ? (
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={languageData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  className="dark:stroke-gray-700"
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280" }}
                  tickFormatter={(value) => formatNumber(value)}
                  className="dark:fill-gray-400"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#6b7280" }}
                  width={75}
                  className="dark:fill-gray-400"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  formatter={(value) => [
                    formatNumber(Number(value)) + " lines",
                    "Lines",
                  ]}
                  labelStyle={{ fontWeight: "bold", color: "#1f2937" }}
                />
                <Bar dataKey="lines" radius={[0, 4, 4, 0]}>
                  {languageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
            No language data available
          </div>
        )}
      </div>

      {/* Language Legend */}
      {languageData.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {languageData.map((lang) => (
            <div
              key={lang.name}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: lang.color }}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {lang.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({formatNumber(lang.lines)})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
