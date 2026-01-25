"use client";

import { useMemo } from "react";
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
  Legend,
} from "recharts";
import { Project, Categories } from "@/lib/types";

interface CategoryChartProps {
  projects: Project[];
  categories: Categories;
  onCategoryClick?: (category: string) => void;
}

export function CategoryChart({
  projects,
  categories,
  onCategoryClick,
}: CategoryChartProps) {
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });

    return Object.entries(categories).map(([key, cat]) => ({
      id: key,
      name: cat.name,
      count: counts[key] || 0,
      color: cat.color,
    }));
  }, [projects, categories]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        カテゴリ別プロジェクト数
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
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
                onClick={(data) => data.id && onCategoryClick?.(data.id)}
                cursor="pointer"
              >
                {categoryData.map((entry) => (
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
                data={categoryData}
                dataKey="count"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                onClick={(data) => data.id && onCategoryClick?.(data.id)}
                cursor="pointer"
                label={({ name, payload }) => `${name}: ${payload?.count ?? 0}`}
                labelLine={false}
              >
                {categoryData.map((entry) => (
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

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {categoryData.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryClick?.(cat.id)}
            className="p-3 rounded-lg text-white text-center transition-transform hover:scale-105"
            style={{ backgroundColor: cat.color }}
          >
            <div className="text-2xl font-bold">{cat.count}</div>
            <div className="text-xs opacity-90">{cat.name}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
