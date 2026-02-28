/** Gamification system for project portfolio achievements */

export interface UserLevel {
  level: number;
  title: string;
  currentXP: number;
  nextLevelXP: number;
  progress: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

const LEVEL_TITLES = [
  "Newbie Developer",
  "Code Explorer",
  "Bug Hunter",
  "Module Master",
  "Architecture Artisan",
  "Full-Stack Wizard",
  "Engineering Lead",
  "Tech Visionary",
  "Code Legend",
  "Grandmaster",
];

/** Calculate user level from total XP using progressive scaling */
export function calculateLevel(totalXP: number): UserLevel {
  let level = 1;
  let xpForNext = 100;
  let accumulated = 0;

  while (accumulated + xpForNext <= totalXP && level < LEVEL_TITLES.length) {
    accumulated += xpForNext;
    level++;
    xpForNext = Math.floor(xpForNext * 1.5);
  }

  const currentXP = totalXP - accumulated;
  const progress = Math.min(100, Math.round((currentXP / xpForNext) * 100));

  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    currentXP,
    nextLevelXP: xpForNext,
    progress,
  };
}

/** Calculate XP from project activity metrics */
export function calculateXP(metrics: {
  projectCount: number;
  totalSessions: number;
  totalMessages: number;
  activeDays: number;
}): number {
  return (
    metrics.projectCount * 50 +
    metrics.totalSessions * 5 +
    metrics.totalMessages * 1 +
    metrics.activeDays * 20
  );
}

/** Evaluate badges based on project portfolio metrics */
export function evaluateBadges(metrics: {
  projectCount: number;
  totalCost: number;
  totalSessions: number;
  techCount: number;
  categoryCount: number;
}): Badge[] {
  return [
    {
      id: "first-project",
      name: "First Steps",
      description: "Create your first project",
      icon: "rocket",
      earned: metrics.projectCount >= 1,
    },
    {
      id: "prolific",
      name: "Prolific Builder",
      description: "Create 10+ projects",
      icon: "layers",
      earned: metrics.projectCount >= 10,
    },
    {
      id: "polyglot",
      name: "Polyglot",
      description: "Use 10+ different technologies",
      icon: "globe",
      earned: metrics.techCount >= 10,
    },
    {
      id: "marathon",
      name: "Marathon Coder",
      description: "Complete 100+ sessions",
      icon: "timer",
      earned: metrics.totalSessions >= 100,
    },
    {
      id: "big-spender",
      name: "Big Spender",
      description: "Spend over $100 on AI assistance",
      icon: "dollar-sign",
      earned: metrics.totalCost >= 100,
    },
    {
      id: "diversified",
      name: "Diversified",
      description: "Projects across 5+ categories",
      icon: "grid",
      earned: metrics.categoryCount >= 5,
    },
  ];
}
