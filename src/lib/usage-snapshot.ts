import fs from "fs";
import path from "path";

// --- Types ---

interface SnapshotTokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

export interface SnapshotDailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  tokens: SnapshotTokenUsage;
  cost: number;
}

export interface SnapshotMonthlySummary {
  month: string;
  cost: number;
  days: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

export interface UsageSnapshotData {
  dailyActivity: SnapshotDailyActivity[];
  monthlySummary: SnapshotMonthlySummary[];
}

interface UsageSnapshotEnvelope {
  version: 1;
  savedAt: string;
  snapshotDate: string;
  data: UsageSnapshotData;
}

// --- Directory & File helpers ---

export function getSnapshotDir(): string {
  return path.join(process.cwd(), "backups", "usage-snapshots");
}

function ensureSnapshotDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// --- Save ---

export function saveSnapshot(data: UsageSnapshotData): { fileName: string; savedAt: string } {
  const dir = getSnapshotDir();
  ensureSnapshotDir(dir);

  const dateStr = getTodayDateStr();
  const fileName = `usage-snapshot-${dateStr}.json`;
  const savedAt = new Date().toISOString();

  const envelope: UsageSnapshotEnvelope = {
    version: 1,
    savedAt,
    snapshotDate: dateStr,
    data,
  };

  const content = JSON.stringify(envelope, null, 2);

  // Write daily file
  fs.writeFileSync(path.join(dir, fileName), content, "utf8");

  // Write latest file
  fs.writeFileSync(path.join(dir, "usage-snapshot-latest.json"), content, "utf8");

  return { fileName, savedAt };
}

// --- Load ---

export function loadAllSnapshots(): UsageSnapshotData[] {
  const dir = getSnapshotDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter(
    (f) => f.startsWith("usage-snapshot-") && f.endsWith(".json") && f !== "usage-snapshot-latest.json"
  );

  const snapshots: UsageSnapshotData[] = [];

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const parsed = JSON.parse(raw) as UsageSnapshotEnvelope;
      if (parsed.version === 1 && parsed.data?.dailyActivity) {
        snapshots.push(parsed.data);
      }
    } catch {
      // Skip corrupted files
    }
  }

  return snapshots;
}

// --- Auto-snapshot check ---

export function shouldAutoSnapshot(dir: string): boolean {
  const fileName = `usage-snapshot-${getTodayDateStr()}.json`;
  return !fs.existsSync(path.join(dir, fileName));
}

// --- Merge ---

interface MergeableDailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  tokens: SnapshotTokenUsage;
  cost: number;
}

interface MergeableResult {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  modelUsage: Record<string, unknown>;
  dailyActivity: MergeableDailyActivity[];
  todayCost: number;
  weekCost: number;
  monthCost: number;
  lastMonthCost: number;
  todayMessages: number;
  monthlySummary: SnapshotMonthlySummary[];
  lastUpdated: string;
  dataSource: string;
}

export function mergeUsageData(
  liveData: MergeableResult | null,
  snapshots: UsageSnapshotData[]
): MergeableResult {
  // Build map: date -> best daily entry (highest cost wins)
  const dailyMap = new Map<string, MergeableDailyActivity>();

  // 1. Load all snapshot data first
  for (const snapshot of snapshots) {
    for (const day of snapshot.dailyActivity) {
      const existing = dailyMap.get(day.date);
      if (!existing || day.cost > existing.cost) {
        dailyMap.set(day.date, { ...day });
      }
    }
  }

  // 2. Overlay live data (highest cost wins)
  if (liveData) {
    for (const day of liveData.dailyActivity) {
      const existing = dailyMap.get(day.date);
      if (!existing || day.cost > existing.cost) {
        dailyMap.set(day.date, { ...day });
      }
    }
  }

  // 3. Sort by date
  const mergedDaily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // 4. Recompute monthly summary from merged daily
  const monthlyMap = new Map<string, SnapshotMonthlySummary>();
  for (const day of mergedDaily) {
    const monthKey = day.date.slice(0, 7); // "2026-01"
    const existing = monthlyMap.get(monthKey) ?? {
      month: monthKey,
      cost: 0,
      days: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheCreateTokens: 0,
    };

    existing.cost += day.cost;
    existing.days += 1;
    existing.inputTokens += day.tokens.inputTokens;
    existing.outputTokens += day.tokens.outputTokens;
    existing.cacheReadTokens += day.tokens.cacheReadTokens;
    existing.cacheCreateTokens += day.tokens.cacheCreateTokens;

    monthlyMap.set(monthKey, existing);
  }

  const mergedMonthly = Array.from(monthlyMap.values())
    .map((m) => ({ ...m, cost: Math.round(m.cost * 100) / 100 }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 5. Recompute period costs from merged daily
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  let totalCost = 0;
  let totalTokens = 0;
  let totalMessages = 0;
  let todayCost = 0;
  let weekCost = 0;
  let monthCost = 0;
  let lastMonthCost = 0;
  let todayMessages = 0;

  for (const day of mergedDaily) {
    totalCost += day.cost;
    totalTokens += day.tokens.inputTokens + day.tokens.outputTokens +
      day.tokens.cacheReadTokens + day.tokens.cacheCreateTokens;
    totalMessages += day.messageCount;

    if (day.date === todayStr) {
      todayCost += day.cost;
      todayMessages += day.messageCount;
    }
    if (day.date >= weekStartStr) {
      weekCost += day.cost;
    }
    if (day.date.startsWith(monthStr)) {
      monthCost += day.cost;
    }
    if (day.date.startsWith(lastMonthStr)) {
      lastMonthCost += day.cost;
    }
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalTokens,
    totalSessions: liveData?.totalSessions ?? 0,
    totalMessages,
    modelUsage: liveData?.modelUsage ?? {},
    dailyActivity: mergedDaily,
    todayCost: Math.round(todayCost * 100) / 100,
    weekCost: Math.round(weekCost * 100) / 100,
    monthCost: Math.round(monthCost * 100) / 100,
    lastMonthCost: Math.round(lastMonthCost * 100) / 100,
    todayMessages,
    monthlySummary: mergedMonthly,
    lastUpdated: new Date().toISOString(),
    dataSource: liveData ? "jsonl+snapshots" : "snapshots",
  };
}
