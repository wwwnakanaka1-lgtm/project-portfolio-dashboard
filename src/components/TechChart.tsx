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
} from "recharts";
import { Project } from "@/lib/types";

interface TechChartProps {
  projects: Project[];
  onTechClick?: (tech: string) => void;
}

const TECH_COLORS: Record<string, string> = {
  Python: "#3776AB",
  TypeScript: "#3178C6",
  JavaScript: "#F7DF1E",
  "Next.js": "#000000",
  FastAPI: "#009688",
  Flask: "#000000",
  Streamlit: "#FF4B4B",
  Gradio: "#FF7C00",
  React: "#61DAFB",
  Dash: "#119DFF",
  pandas: "#150458",
  "scikit-learn": "#F7931E",
  Plotly: "#3F4F75",
  yfinance: "#10B981",
};

export function TechChart({ projects, onTechClick }: TechChartProps) {
  const techData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach((p) => {
      p.technologies.forEach((tech) => {
        counts[tech] = (counts[tech] || 0) + 1;
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        color: TECH_COLORS[name] || "#6B7280",
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [projects]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        技術スタック使用頻度（Top 15）
      </h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={techData}
            layout="vertical"
            margin={{ left: 80, right: 20 }}
          >
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="name"
              width={80}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value) => [`${value}件`, "使用プロジェクト"]}
            />
            <Bar
              dataKey="count"
              onClick={(data) => data.name && onTechClick?.(data.name)}
              cursor="pointer"
            >
              {techData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tech Tags */}
      <div className="flex flex-wrap gap-2 mt-4">
        {techData.map((tech) => (
          <button
            key={tech.name}
            onClick={() => onTechClick?.(tech.name)}
            className="px-3 py-1 rounded-full text-white text-sm transition-transform hover:scale-105"
            style={{ backgroundColor: tech.color }}
          >
            {tech.name} ({tech.count})
          </button>
        ))}
      </div>
    </div>
  );
}
