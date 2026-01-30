import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// Pricing per 1M tokens
const MODEL_PRICING = {
  "claude-opus-4-5-20251101": {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheCreate: 18.75,
  },
  "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheCreate: 3.75,
  },
} as const;

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

export async function GET() {
  try {
    const homeDir = os.homedir();
    const projectsDir = path.join(homeDir, ".claude", "projects");

    // Find the correct project directory
    const variations = ["C--Users-wwwhi", "c--Users-wwwhi"];
    let projectDir = "";

    for (const dir of variations) {
      const testPath = path.join(projectsDir, dir);
      if (fs.existsSync(testPath)) {
        projectDir = testPath;
        break;
      }
    }

    if (!projectDir) {
      return NextResponse.json({ error: "Project directory not found" }, { status: 404 });
    }

    // Read all JSONL files
    const files = fs.readdirSync(projectDir).filter((f) => f.endsWith(".jsonl"));

    const modelUsage: Record<string, ModelUsage> = {};
    const dailyData: Record<string, DailyActivity> = {};
    let totalMessages = 0;
    let totalSessions = files.length;

    for (const file of files) {
      const filePath = path.join(projectDir, file);
      const content = fs.readFileSync(filePath, "utf8");
      const lines = content.split("\n").filter((l) => l.trim());

      let sessionDate = "";
      let sessionMessages = 0;
      let sessionToolCalls = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);

          // Get session date from first entry
          if (!sessionDate && entry.timestamp) {
            sessionDate = entry.timestamp.split("T")[0];
          }

          // Count messages
          if (entry.type === "user" || entry.type === "assistant") {
            sessionMessages++;
            totalMessages++;
          }

          // Count tool calls
          if (entry.message?.content) {
            const content = entry.message.content;
            if (Array.isArray(content)) {
              sessionToolCalls += content.filter((c: { type: string }) => c.type === "tool_use").length;
            }
          }

          // Process token usage
          if (entry.message?.usage) {
            const u = entry.message.usage;
            const model = entry.message.model || "claude-opus-4-5-20251101";

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

            // Accumulate tokens
            modelUsage[model].inputTokens += u.input_tokens || 0;
            modelUsage[model].outputTokens += u.output_tokens || 0;
            modelUsage[model].cacheReadTokens += u.cache_read_input_tokens || 0;
            modelUsage[model].cacheCreateTokens += u.cache_creation_input_tokens || 0;

            // Initialize daily data if needed
            const date = entry.timestamp?.split("T")[0] || sessionDate;
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
              dailyData[date].tokens.inputTokens += u.input_tokens || 0;
              dailyData[date].tokens.outputTokens += u.output_tokens || 0;
              dailyData[date].tokens.cacheReadTokens += u.cache_read_input_tokens || 0;
              dailyData[date].tokens.cacheCreateTokens += u.cache_creation_input_tokens || 0;
            }
          }
        } catch {
          // Skip invalid JSON lines
        }
      }

      // Update daily session/message counts
      if (sessionDate && dailyData[sessionDate]) {
        dailyData[sessionDate].sessionCount++;
        dailyData[sessionDate].messageCount += sessionMessages;
        dailyData[sessionDate].toolCallCount += sessionToolCalls;
      }
    }

    // Calculate costs for each model
    for (const [model, usage] of Object.entries(modelUsage)) {
      const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING["claude-opus-4-5-20251101"];
      usage.cost =
        (usage.inputTokens / 1e6) * pricing.input +
        (usage.outputTokens / 1e6) * pricing.output +
        (usage.cacheReadTokens / 1e6) * pricing.cacheRead +
        (usage.cacheCreateTokens / 1e6) * pricing.cacheCreate;
    }

    // Calculate daily costs
    for (const day of Object.values(dailyData)) {
      const pricing = MODEL_PRICING["claude-opus-4-5-20251101"];
      day.cost =
        (day.tokens.inputTokens / 1e6) * pricing.input +
        (day.tokens.outputTokens / 1e6) * pricing.output +
        (day.tokens.cacheReadTokens / 1e6) * pricing.cacheRead +
        (day.tokens.cacheCreateTokens / 1e6) * pricing.cacheCreate;
    }

    // Calculate totals
    const totalCost = Object.values(modelUsage).reduce((sum, m) => sum + m.cost, 0);
    const totalTokens = Object.values(modelUsage).reduce(
      (sum, m) => sum + m.inputTokens + m.outputTokens + m.cacheReadTokens + m.cacheCreateTokens,
      0
    );

    // Sort daily activity by date
    const dailyActivity = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate period costs
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    // Week start (Monday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Month start
    const monthStartStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

    // Last month key
    const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, "0")}`;

    let todayCost = 0;
    let weekCost = 0;
    let monthCost = 0;
    let lastMonthCost = 0;
    let todayMessages = 0;

    // Monthly aggregation
    const monthlyCosts: Record<string, { cost: number; days: number; tokens: TokenUsage }> = {};

    for (const day of dailyActivity) {
      const monthKey = day.date.substring(0, 7);

      // Aggregate by month
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

      // Period costs
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

    // Build monthly summary array
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

    return NextResponse.json({
      totalCost: Math.round(totalCost * 100) / 100,
      totalTokens,
      totalSessions,
      totalMessages,
      modelUsage,
      dailyActivity,
      // Period costs
      todayCost: Math.round(todayCost * 100) / 100,
      weekCost: Math.round(weekCost * 100) / 100,
      monthCost: Math.round(monthCost * 100) / 100,
      lastMonthCost: Math.round(lastMonthCost * 100) / 100,
      todayMessages,
      // Monthly summary
      monthlySummary,
      lastUpdated: new Date().toISOString(),
      dataSource: "jsonl",
    });
  } catch (error) {
    console.error("Error reading JSONL files:", error);
    return NextResponse.json(
      { error: "Failed to read usage data", details: String(error) },
      { status: 500 }
    );
  }
}
