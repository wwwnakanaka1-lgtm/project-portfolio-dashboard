/** Daily activity data for cost forecasting */
interface DailyActivity {
  date: string;
  cost: number;
  messageCount: number;
}

/** Cost forecast result with projected month-end cost and confidence metrics */
export interface CostForecast {
  /** Projected total cost for the current month */
  projectedMonthEnd: number;
  /** Confidence level based on data quality and R-squared value */
  confidence: "high" | "medium" | "low";
  /** Trend direction based on regression slope */
  trend: "increasing" | "stable" | "decreasing";
  /** Average daily cost over the analysis period */
  dailyAverage: number;
  /** Number of remaining days in the current month */
  remainingDays: number;
}

/**
 * Perform simple linear regression on (x, y) data points.
 *
 * @returns Object with slope, intercept, and R-squared value.
 *   Returns zero slope and zero R-squared if fewer than 2 data points
 *   or if all x values are identical.
 */
function linearRegression(
  xs: number[],
  ys: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = xs.length;

  if (n < 2) {
    const meanY = n === 1 ? ys[0] : 0;
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }

  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);

  const denominator = n * sumX2 - sumX * sumX;

  // All x values identical — no regression possible
  if (Math.abs(denominator) < 1e-10) {
    return { slope: 0, intercept: sumY / n, rSquared: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);

  if (ssTotal < 1e-10) {
    // All y values identical — perfect fit with zero variance
    return { slope: 0, intercept: meanY, rSquared: 1 };
  }

  const ssResidual = xs.reduce((s, x, i) => {
    const predicted = slope * x + intercept;
    return s + (ys[i] - predicted) ** 2;
  }, 0);

  const rSquared = Math.max(0, 1 - ssResidual / ssTotal);

  return { slope, intercept, rSquared };
}

/**
 * Get the number of days in a given month.
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Forecast end-of-month cost using linear regression on recent daily costs.
 *
 * The function analyzes the past 14 days of daily cost data to project
 * the total cost at month end. It uses simple linear regression to
 * estimate a daily cost trend, then extrapolates for the remaining days.
 *
 * Confidence levels are determined by both data quantity and regression quality:
 * - **high**: 10+ days of data AND R-squared > 0.7
 * - **medium**: 5-9 days of data OR R-squared between 0.3 and 0.7
 * - **low**: fewer than 5 days of data OR R-squared < 0.3
 *
 * Trend classification uses the slope relative to the daily average:
 * - **increasing**: slope > 5% of daily average
 * - **decreasing**: slope < -5% of daily average
 * - **stable**: slope within +/- 5% of daily average
 *
 * @param dailyActivity - Array of daily activity records with cost data.
 * @param currentMonthCost - The total cost accumulated so far this month.
 * @returns Forecast with projected month-end cost, confidence, trend, and daily average.
 */
export function forecastMonthlyCost(
  dailyActivity: DailyActivity[],
  currentMonthCost: number
): CostForecast {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();
  const totalDaysInMonth = daysInMonth(currentYear, currentMonth);
  const remainingDays = Math.max(0, totalDaysInMonth - today);

  // Filter to past 14 days of data
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - 14);

  const recentData = dailyActivity
    .filter((d) => {
      const date = new Date(d.date);
      return date >= cutoffDate && date <= now;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Edge case: no data at all
  if (recentData.length === 0) {
    return {
      projectedMonthEnd: currentMonthCost,
      confidence: "low",
      trend: "stable",
      dailyAverage: 0,
      remainingDays,
    };
  }

  // Prepare regression data: x = day index (0-based), y = cost
  const xs = recentData.map((_, i) => i);
  const ys = recentData.map((d) => d.cost);

  const { slope, intercept, rSquared } = linearRegression(xs, ys);

  const dailyAverage = ys.reduce((s, y) => s + y, 0) / ys.length;

  // Project remaining cost using the regression line
  // Estimate future daily costs from the trend
  let projectedRemainingCost = 0;
  const lastIndex = recentData.length - 1;

  for (let dayOffset = 1; dayOffset <= remainingDays; dayOffset++) {
    const projectedDailyCost = slope * (lastIndex + dayOffset) + intercept;
    // Don't allow negative projected daily costs
    projectedRemainingCost += Math.max(0, projectedDailyCost);
  }

  const projectedMonthEnd = currentMonthCost + projectedRemainingCost;

  // Determine confidence
  const dataCount = recentData.length;
  let confidence: CostForecast["confidence"];
  if (dataCount >= 10 && rSquared > 0.7) {
    confidence = "high";
  } else if (dataCount < 5 || rSquared < 0.3) {
    confidence = "low";
  } else {
    confidence = "medium";
  }

  // Determine trend: slope relative to daily average
  const slopeThreshold = dailyAverage > 0 ? dailyAverage * 0.05 : 0.01;
  let trend: CostForecast["trend"];
  if (slope > slopeThreshold) {
    trend = "increasing";
  } else if (slope < -slopeThreshold) {
    trend = "decreasing";
  } else {
    trend = "stable";
  }

  return {
    projectedMonthEnd,
    confidence,
    trend,
    dailyAverage,
    remainingDays,
  };
}
