import { NextResponse } from "next/server";
import { getCachedSync } from "@/lib/api-cache";
import { getPricing } from "@/lib/usage-types";
import { getClaudeFileData } from "@/lib/file-cache";
import { getClaudeJsonlFiles } from "@/lib/file-discovery";

// Cache TTL - 2 minutes for usage stats (SWR handles interim)
const USAGE_STATS_CACHE_TTL = 120000; // 2 minutes (SWR handles interim)

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

interface DailyActivity {
  date: string;
  messageCount: number;
  sessionCount: number;
  toolCallCount: number;
  tokens: TokenUsage;
  cost: number;
}

interface ModelUsage extends TokenUsage {
  cost: number;
}

interface UsageStatsResult {
  totalCost: number;
  totalTokens: number;
  totalSessions: number;
  totalMessages: number;
  modelUsage: Record<string, ModelUsage>;
  dailyActivity: DailyActivity[];
  todayCost: number;
  weekCost: number;
  monthCost: number;
  lastMonthCost: number;
  todayMessages: number;
  monthlySummary: Array<{
    month: string;
    cost: number;
    days: number;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreateTokens: number;
  }>;
  lastUpdated: string;
  dataSource: string;
}

// Compute usage statistics (uses file-discovery + file-cache for performance)
function computeUsageStats(): UsageStatsResult | { error: string } {
  const files = getClaudeJsonlFiles();
  if (files.length === 0) {
    return { error: "No JSONL files found" };
  }

  const modelUsage: Record<string, ModelUsage> = {};
  const dailyData: Record<string, DailyActivity> = {};
  let totalMessages = 0;
  const totalSessions = files.length;

  for (const filePath of files) {
    const fileData = getClaudeFileData(filePath);
    if (!fileData) continue;

    totalMessages += fileData.messageCount;

    // Track session date from first usage entry
    let sessionDate = "";

    // Aggregate from pre-computed usage entries
    for (const ue of fileData.usageEntries) {
      const model = ue.model;
      const date = ue.date;

      if (!sessionDate && date) {
        sessionDate = date;
      }

      // Initialize model usage if needed
      if (!modelUsage[model]) {
        modelUsage[model] = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheCreateTokens: 0,
          cost: 0,
        };
      }

      modelUsage[model].inputTokens += ue.inputTokens;
      modelUsage[model].outputTokens += ue.outputTokens;
      modelUsage[model].cacheReadTokens += ue.cacheReadTokens;
      modelUsage[model].cacheCreateTokens += ue.cacheCreateTokens;

      // Initialize daily data if needed
      if (date && !dailyData[date]) {
        dailyData[date] = {
          date,
          messageCount: 0,
          sessionCount: 0,
          toolCallCount: 0,
          tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0 },
          cost: 0,
        };
      }

      if (date) {
        dailyData[date].tokens.inputTokens += ue.inputTokens;
        dailyData[date].tokens.outputTokens += ue.outputTokens;
        dailyData[date].tokens.cacheReadTokens += ue.cacheReadTokens;
        dailyData[date].tokens.cacheCreateTokens += ue.cacheCreateTokens;
      }
    }

    // Update daily session/message/tool counts
    if (sessionDate && dailyData[sessionDate]) {
      dailyData[sessionDate].sessionCount++;
      dailyData[sessionDate].messageCount += fileData.messageCount;
      dailyData[sessionDate].toolCallCount += fileData.toolCallCount;
    }
  }

  // Calculate costs for each model (unchanged logic)
  for (const [model, usage] of Object.entries(modelUsage)) {
    const pricing = getPricing(model);
    usage.cost =
      (usage.inputTokens / 1e6) * pricing.input +
      (usage.outputTokens / 1e6) * pricing.output +
      (usage.cacheReadTokens / 1e6) * pricing.cacheRead +
      (usage.cacheCreateTokens / 1e6) * pricing.cacheCreate;
  }

  // Calculate daily costs
  for (const day of Object.values(dailyData)) {
    const pricing = getPricing("claude-opus-4-5-20251101");
    day.cost =
      (day.tokens.inputTokens / 1e6) * pricing.input +
      (day.tokens.outputTokens / 1e6) * pricing.output +
      (day.tokens.cacheReadTokens / 1e6) * pricing.cacheRead +
      (day.tokens.cacheCreateTokens / 1e6) * pricing.cacheCreate;
  }

  // === Everything below this line stays exactly the same as the original ===
  // Calculate totals
  const totalCost = Object.values(modelUsage).reduce((sum, m) => sum + m.cost, 0);
  const totalTokens = Object.values(modelUsage).reduce(
    (sum, m) => sum + m.inputTokens + m.outputTokens + m.cacheReadTokens + m.cacheCreateTokens,
    0
  );

  const dailyActivity = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

  let todayCost = 0;
  let weekCost = 0;
  let monthCost = 0;
  let lastMonthCost = 0;
  let todayMessages = 0;

  const monthlyCosts: Record<string, { cost: number; days: number; tokens: TokenUsage }> = {};

  for (const day of dailyActivity) {
    const monthKey = day.date.substring(0, 7);

    if (!monthlyCosts[monthKey]) {
      monthlyCosts[monthKey] = {
        cost: 0,
        days: 0,
        tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreateTokens: 0 },
      };
    }
    monthlyCosts[monthKey].cost += day.cost;
    monthlyCosts[monthKey].days += 1;
    monthlyCosts[monthKey].tokens.inputTokens += day.tokens.inputTokens;
    monthlyCosts[monthKey].tokens.outputTokens += day.tokens.outputTokens;
    monthlyCosts[monthKey].tokens.cacheReadTokens += day.tokens.cacheReadTokens;
    monthlyCosts[monthKey].tokens.cacheCreateTokens += day.tokens.cacheCreateTokens;

    if (day.date === todayStr) {
      todayCost = day.cost;
      todayMessages = day.messageCount;
    }
    if (day.date >= weekStartStr) {
      weekCost += day.cost;
    }
    if (day.date >= monthStartStr) {
      monthCost += day.cost;
    }
    if (day.date.startsWith(lastMonthKey)) {
      lastMonthCost += day.cost;
    }
  }

  const monthlySummary = Object.entries(monthlyCosts)
    .map(([month, data]) => ({
      month,
      cost: Math.round(data.cost * 100) / 100,
      days: data.days,
      inputTokens: data.tokens.inputTokens,
      outputTokens: data.tokens.outputTokens,
      cacheReadTokens: data.tokens.cacheReadTokens,
      cacheCreateTokens: data.tokens.cacheCreateTokens,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    totalTokens,
    totalSessions,
    totalMessages,
    modelUsage,
    dailyActivity,
    todayCost: Math.round(todayCost * 100) / 100,
    weekCost: Math.round(weekCost * 100) / 100,
    monthCost: Math.round(monthCost * 100) / 100,
    lastMonthCost: Math.round(lastMonthCost * 100) / 100,
    todayMessages,
    monthlySummary,
    lastUpdated: new Date().toISOString(),
    dataSource: "jsonl",
  };
}

export async function GET() {
  try {
    // 1. Compute live stats from JSONL files (cached)
    const liveResult = getCachedSync("usage-stats", USAGE_STATS_CACHE_TTL, computeUsageStats);

    // 2. Load historical snapshots
    const { loadAllSnapshots, saveSnapshot, shouldAutoSnapshot, getSnapshotDir, mergeUsageData } = await import("@/lib/usage-snapshot");
    const snapshots = loadAllSnapshots();

    if ("error" in liveResult) {
      // Even if live data fails, try to return snapshot-only data
      if (snapshots.length === 0) {
        return NextResponse.json({ error: liveResult.error }, { status: 404 });
      }
      const fallbackResult = mergeUsageData(null, snapshots);
      return NextResponse.json(fallbackResult);
    }

    // 3. Merge live + historical
    const mergedResult = mergeUsageData(liveResult, snapshots);

    // 4. Auto-snapshot live data (fire-and-forget, once per day)
    const snapshotDir = getSnapshotDir();
    if (shouldAutoSnapshot(snapshotDir)) {
      try {
        saveSnapshot({
          dailyActivity: liveResult.dailyActivity,
          monthlySummary: liveResult.monthlySummary,
        });
      } catch (err) {
        console.error("Auto-snapshot failed:", err);
      }
    }

    return NextResponse.json(mergedResult);
  } catch (error) {
    console.error("Error reading JSONL files:", error);
    return NextResponse.json(
      { error: "Failed to read usage data", details: String(error) },
      { status: 500 }
    );
  }
}
