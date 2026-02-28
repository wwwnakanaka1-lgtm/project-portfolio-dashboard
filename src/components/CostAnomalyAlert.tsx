"use client";

import { useMemo } from "react";
import { detectCostAnomalies, type CostAnomaly } from "@/lib/cost-anomaly";

interface CostAnomalyAlertProps {
  dailyActivity: Array<{ date: string; cost: number; messageCount: number }>;
  exchangeRate: number;
}

/**
 * Displays cost anomaly alerts when unusual spending patterns are detected.
 * Uses z-score analysis on rolling 7-day windows.
 */
export function CostAnomalyAlert({ dailyActivity, exchangeRate }: CostAnomalyAlertProps) {
  const anomalies = useMemo(
    () => detectCostAnomalies(dailyActivity).slice(0, 3),
    [dailyActivity]
  );

  if (anomalies.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {anomalies.map((anomaly: CostAnomaly) => (
        <div
          key={anomaly.date}
          className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
            anomaly.severity === "critical"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
          }`}
        >
          <span className="text-lg">
            {anomaly.severity === "critical" ? "🔴" : "🟡"}
          </span>
          <div className="flex-1">
            <span className="font-medium text-gray-900 dark:text-white">
              {anomaly.date}
            </span>
            <span className="text-gray-500 dark:text-gray-400 ml-2">
              ${anomaly.cost.toFixed(2)} (¥{Math.round(anomaly.cost * exchangeRate).toLocaleString()})
            </span>
            <span className="text-gray-400 dark:text-gray-500 ml-1">
              — 平均 ${anomaly.expected.toFixed(2)} の {anomaly.zscore.toFixed(1)}σ
            </span>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              anomaly.severity === "critical"
                ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
            }`}
          >
            {anomaly.severity === "critical" ? "Critical" : "Warning"}
          </span>
        </div>
      ))}
    </div>
  );
}
