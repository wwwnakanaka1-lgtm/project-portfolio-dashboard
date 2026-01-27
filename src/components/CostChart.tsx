"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface CostChartProps {
  cost: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number; // USD
  };
}

const COLORS = {
  light: {
    input: "#3b82f6", // blue-500
    output: "#10b981", // emerald-500
  },
  dark: {
    input: "#60a5fa", // blue-400
    output: "#34d399", // emerald-400
  },
};

export default function CostChart({ cost }: CostChartProps) {
  const { totalTokens, inputTokens, outputTokens, estimatedCost } = cost;

  const pieData = [
    { name: "Input Tokens", value: inputTokens, color: "input" as const },
    { name: "Output Tokens", value: outputTokens, color: "output" as const },
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / totalTokens) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {data.name}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatNumber(data.value)} tokens ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Cost Tracking
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Total Tokens
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {formatNumber(totalTokens)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Estimated Cost
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCost(estimatedCost)}
          </p>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 dark:bg-blue-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Input</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatNumber(inputTokens)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500 dark:bg-emerald-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Output</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {formatNumber(outputTokens)}
            </p>
          </div>
        </div>
      </div>

      {/* Pie Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color === "input" ? COLORS.light.input : COLORS.light.output}
                  className="dark:opacity-90"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Cost Breakdown Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Cost calculated based on Claude API pricing
        </p>
      </div>
    </div>
  );
}
