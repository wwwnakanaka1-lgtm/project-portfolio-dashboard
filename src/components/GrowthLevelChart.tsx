"use client";

import { useMemo, memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Project, GrowthLevel } from "@/lib/types";
import { countByGrowthLevel } from "@/lib/growth-level";

interface GrowthLevelChartProps {
  projects: Project[];
  onGrowthLevelClick?: (level: GrowthLevel) => void;
}

export const GrowthLevelChart = memo(function GrowthLevelChart({
  projects,
  onGrowthLevelClick,
}: GrowthLevelChartProps) {
  const chartData = useMemo(() => {
    return countByGrowthLevel(projects).map((entry) => ({
      id: entry.level,
      name: `${entry.info.icon} ${entry.info.labelJa}`,
      count: entry.count,
      color: entry.info.color,
      icon: entry.info.icon,
      labelJa: entry.info.labelJa,
    }));
  }, [projects]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        成長レベル別プロジェクト数
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 20, right: 20 }}
            >
              <XAxis type="number" />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value) => [`${value}件`, "プロジェクト数"]}
              />
              <Bar
                dataKey="count"
                onClick={(data) => data.id && onGrowthLevelClick?.(data.id as GrowthLevel)}
                cursor="pointer"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                onClick={(data) => data.id && onGrowthLevelClick?.(data.id as GrowthLevel)}
                cursor="pointer"
                label={({ name, payload }) => `${name}: ${payload?.count ?? 0}`}
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${value}件`, "プロジェクト数"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Level Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {chartData.map((level) => (
          <button
            key={level.id}
            onClick={() => onGrowthLevelClick?.(level.id as GrowthLevel)}
            className="p-3 rounded-lg text-center transition-transform hover:scale-105"
            style={{
              backgroundColor: `${level.color}18`,
              border: `1px solid ${level.color}40`,
            }}
          >
            <div className="text-2xl">{level.icon}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: level.color }}>
              {level.count}
            </div>
            <div className="text-xs font-medium" style={{ color: level.color }}>
              {level.labelJa}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
