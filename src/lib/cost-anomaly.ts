/** Daily activity data for cost anomaly detection */
interface DailyActivity {
  date: string;
  cost: number;
  messageCount: number;
}

/** Detected cost anomaly with severity classification */
export interface CostAnomaly {
  /** The date of the anomalous cost */
  date: string;
  /** The actual cost on that day */
  cost: number;
  /** The expected cost based on the rolling 7-day mean */
  expected: number;
  /** The z-score indicating how far the cost deviates from the mean */
  zscore: number;
  /** Warning: z-score > 2, Critical: z-score > 3 */
  severity: "warning" | "critical";
}

/**
 * Detect cost anomalies using z-score analysis on rolling 7-day windows.
 *
 * For each day starting from day 8 onward, the function calculates the mean
 * and standard deviation of the previous 7 days' costs. A z-score is computed
 * as `(cost - mean) / stddev`. Days with z-score > 2 are flagged as warnings,
 * and z-score > 3 as critical.
 *
 * @param dailyActivity - Array of daily activity records with cost data.
 *   Must contain at least 8 entries for any anomalies to be detected.
 * @returns Array of detected anomalies sorted by date descending (most recent first).
 *   Returns an empty array if fewer than 8 days of data are provided.
 */
export function detectCostAnomalies(dailyActivity: DailyActivity[]): CostAnomaly[] {
  if (dailyActivity.length < 8) {
    return [];
  }

  // Sort by date ascending to ensure correct rolling window order
  const sorted = [...dailyActivity].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const anomalies: CostAnomaly[] = [];

  for (let i = 7; i < sorted.length; i++) {
    const window = sorted.slice(i - 7, i);
    const current = sorted[i];

    const costs = window.map((d) => d.cost);
    const mean = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    const variance =
      costs.reduce((sum, c) => sum + (c - mean) ** 2, 0) / costs.length;
    const stddev = Math.sqrt(variance);

    // Skip if stddev is zero or near-zero (all costs identical) to avoid division by zero
    if (stddev < 1e-10) {
      continue;
    }

    const zscore = (current.cost - mean) / stddev;

    if (zscore > 3) {
      anomalies.push({
        date: current.date,
        cost: current.cost,
        expected: mean,
        zscore,
        severity: "critical",
      });
    } else if (zscore > 2) {
      anomalies.push({
        date: current.date,
        cost: current.cost,
        expected: mean,
        zscore,
        severity: "warning",
      });
    }
  }

  // Return sorted by date descending (most recent first)
  return anomalies.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
