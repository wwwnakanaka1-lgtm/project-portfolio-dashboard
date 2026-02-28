/** Project health score with letter grade and individual factor breakdown */
export interface ProjectHealth {
  /** Overall health score from 0 to 100 */
  score: number;
  /** Letter grade derived from the score */
  grade: "A" | "B" | "C" | "D" | "F";
  /** Individual factor scores, each ranging from 0 to 100 */
  factors: {
    /** How recently the project was active (recent = higher score, decays over 30 days) */
    activityRecency: number;
    /** Cost per message efficiency (lower cost per message = higher score) */
    costEfficiency: number;
    /** Session duration health (penalizes very short or very long sessions) */
    sessionHealth: number;
  };
}

/** Project activity metrics used to calculate health */
interface ProjectActivity {
  /** ISO date string of the last active date */
  lastActiveDate: string;
  /** Total cost in USD */
  totalCost: number;
  /** Total number of messages */
  totalMessages: number;
  /** Total number of sessions */
  sessionCount: number;
  /** Average session duration in minutes */
  averageSessionMinutes: number;
}

/**
 * Calculate the number of days between two dates (ignoring time of day).
 */
function daysBetween(dateA: Date, dateB: Date): number {
  const msPerDay = 86400000;
  const utcA = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const utcB = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.abs(utcB - utcA) / msPerDay;
}

/**
 * Calculate the activity recency score.
 *
 * Returns 100 if the project was active today, linearly decaying to 0
 * over 30 days. Projects inactive for more than 30 days score 0.
 *
 * @param lastActiveDate - ISO date string of the last activity date.
 * @returns Score from 0 to 100.
 */
function calculateActivityRecency(lastActiveDate: string): number {
  const lastActive = new Date(lastActiveDate);
  const now = new Date();
  const daysInactive = daysBetween(lastActive, now);

  if (daysInactive >= 30) {
    return 0;
  }

  return Math.round(100 * (1 - daysInactive / 30));
}

/**
 * Calculate the cost efficiency score based on cost per message.
 *
 * Lower cost per message yields a higher score. The scoring uses an
 * exponential decay model:
 * - $0 per message = 100
 * - ~$0.50 per message = ~61
 * - ~$1.00 per message = ~37
 * - ~$2.00 per message = ~14
 * - ~$5.00 per message = ~1
 *
 * @param totalCost - Total cost in USD.
 * @param totalMessages - Total number of messages.
 * @returns Score from 0 to 100.
 */
function calculateCostEfficiency(totalCost: number, totalMessages: number): number {
  // No messages means we can't evaluate efficiency
  if (totalMessages <= 0) {
    return 50; // Neutral score when no data
  }

  if (totalCost <= 0) {
    return 100; // Free is maximally efficient
  }

  const costPerMessage = totalCost / totalMessages;

  // Exponential decay: score = 100 * e^(-costPerMessage)
  // This naturally maps $0 -> 100, higher costs -> lower scores
  const score = 100 * Math.exp(-costPerMessage);

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Calculate the session health score based on average session duration.
 *
 * Optimal session duration is between 5 and 60 minutes. Sessions within
 * this range score 100. Very short sessions (<1 min) and very long
 * sessions (>120 min) are penalized more heavily.
 *
 * Scoring:
 * - 5-60 minutes: 100 (optimal range)
 * - 1-5 minutes: linearly scales from 50 to 100
 * - 60-120 minutes: linearly scales from 100 to 50
 * - <1 minute: linearly scales from 20 to 50
 * - >120 minutes: 20 (excessive sessions)
 *
 * @param averageSessionMinutes - Average session duration in minutes.
 * @param sessionCount - Total number of sessions (for edge case handling).
 * @returns Score from 0 to 100.
 */
function calculateSessionHealth(
  averageSessionMinutes: number,
  sessionCount: number
): number {
  // No sessions — neutral score
  if (sessionCount <= 0) {
    return 50;
  }

  const mins = averageSessionMinutes;

  if (mins < 0) {
    return 0;
  }

  // Very short sessions (< 1 min) — likely automated or errors
  if (mins < 1) {
    return Math.round(20 + 30 * mins);
  }

  // Short sessions (1-5 min) — somewhat useful but brief
  if (mins < 5) {
    return Math.round(50 + 50 * ((mins - 1) / 4));
  }

  // Optimal range (5-60 min)
  if (mins <= 60) {
    return 100;
  }

  // Long sessions (60-120 min) — diminishing returns
  if (mins <= 120) {
    return Math.round(100 - 50 * ((mins - 60) / 60));
  }

  // Very long sessions (> 120 min) — likely indicates problems
  return 20;
}

/**
 * Convert a numeric score (0-100) to a letter grade.
 *
 * - A: 80-100
 * - B: 60-79
 * - C: 40-59
 * - D: 20-39
 * - F: 0-19
 */
function scoreToGrade(score: number): ProjectHealth["grade"] {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

/**
 * Calculate project health based on activity recency, cost efficiency, and session patterns.
 *
 * The overall score is a weighted average of three factors:
 * - **Activity Recency (40%)**: How recently the project was active. 100 if active today,
 *   linearly decays to 0 over 30 days of inactivity.
 * - **Cost Efficiency (30%)**: Cost per message efficiency. Lower cost per message yields
 *   higher scores using an exponential decay model.
 * - **Session Health (30%)**: Whether session durations fall in a healthy range (5-60 min).
 *   Very short (<1 min) and very long (>120 min) sessions are penalized.
 *
 * Grade thresholds: A (80+), B (60-79), C (40-59), D (20-39), F (<20).
 *
 * @param activity - Project activity metrics including dates, costs, messages, and sessions.
 * @returns Project health object with overall score, letter grade, and factor breakdown.
 */
export function calculateProjectHealth(activity: ProjectActivity): ProjectHealth {
  const activityRecency = calculateActivityRecency(activity.lastActiveDate);
  const costEfficiency = calculateCostEfficiency(
    activity.totalCost,
    activity.totalMessages
  );
  const sessionHealth = calculateSessionHealth(
    activity.averageSessionMinutes,
    activity.sessionCount
  );

  // Weighted average: recency 40%, efficiency 30%, session 30%
  const score = Math.round(
    activityRecency * 0.4 + costEfficiency * 0.3 + sessionHealth * 0.3
  );

  const grade = scoreToGrade(score);

  return {
    score,
    grade,
    factors: {
      activityRecency,
      costEfficiency,
      sessionHealth,
    },
  };
}
