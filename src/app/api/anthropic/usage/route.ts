import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";

interface DashboardConfig {
  anthropicApiKey: string | null;
  keyType: "admin" | "standard" | "oauth" | "unknown" | null;
}

function loadConfig(): DashboardConfig {
  const homeDir = os.homedir();
  const configPath = path.join(homeDir, ".claude", "dashboard-config.json");

  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error loading config:", err);
  }

  return { anthropicApiKey: null, keyType: null };
}

interface TokenUsage {
  input: number;
  output: number;
}

interface UsageResult {
  today: { tokens: TokenUsage; cost: number };
  month: { tokens: TokenUsage; cost: number };
  source: string;
  fetchedAt: string;
}

// Fetch usage from Anthropic Admin API
async function fetchAnthropicUsage(apiKey: string): Promise<UsageResult> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const url = new URL("https://api.anthropic.com/v1/organizations/usage_report/messages");
  url.searchParams.set("starting_at", startOfMonth.toISOString());
  url.searchParams.set("ending_at", today.toISOString());
  url.searchParams.set("bucket_width", "1d");

  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              const buckets = response.data || [];

              let todayTokens: TokenUsage = { input: 0, output: 0 };
              let monthTokens: TokenUsage = { input: 0, output: 0 };

              for (const bucket of buckets) {
                const bucketDate = new Date(bucket.bucket_start_time);
                const inputTokens =
                  (bucket.uncached_input_tokens || 0) +
                  (bucket.cached_input_tokens || 0) +
                  (bucket.cache_creation_input_tokens || 0);
                const outputTokens = bucket.output_tokens || 0;

                monthTokens.input += inputTokens;
                monthTokens.output += outputTokens;

                if (bucketDate >= startOfDay) {
                  todayTokens.input += inputTokens;
                  todayTokens.output += outputTokens;
                }
              }

              // Calculate costs (Opus 4.5 pricing)
              const pricing = { input: 15, output: 75 }; // per 1M tokens
              const todayCost =
                (todayTokens.input / 1e6) * pricing.input +
                (todayTokens.output / 1e6) * pricing.output;
              const monthCost =
                (monthTokens.input / 1e6) * pricing.input +
                (monthTokens.output / 1e6) * pricing.output;

              resolve({
                today: { tokens: todayTokens, cost: todayCost },
                month: { tokens: monthTokens, cost: monthCost },
                source: "anthropic-api",
                fetchedAt: new Date().toISOString(),
              });
            } catch (err) {
              reject(new Error(`Failed to parse response: ${err}`));
            }
          } else {
            reject(new Error(`API error: ${res.statusCode} - ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export async function GET() {
  try {
    const config = loadConfig();

    if (!config.anthropicApiKey) {
      return NextResponse.json({
        error: "API key not configured",
        keyType: null,
      });
    }

    if (config.keyType !== "admin") {
      let message = "Admin APIキーが必要です";
      if (config.keyType === "oauth") {
        message = "Maxプラン使用量はclaude.aiで確認してください";
      } else if (config.keyType === "standard") {
        message = "Standard APIキーでは使用量取得ができません";
      }

      return NextResponse.json({
        error: message,
        keyType: config.keyType,
      });
    }

    const result = await fetchAnthropicUsage(config.anthropicApiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Anthropic usage:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch usage",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
