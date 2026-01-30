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

interface RateLimitResult {
  usagePercent: number;
  outputTokensLimit: number | null;
  outputTokensRemaining: number | null;
  tokensLimit: number | null;
  tokensRemaining: number | null;
  resetTimeStr: string;
  source: string;
  fetchedAt: string;
}

// Fetch rate limit info from Anthropic API
async function fetchAnthropicRateLimit(apiKey: string): Promise<RateLimitResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          // Extract rate limit headers (even from failed requests)
          const headers = res.headers;

          const h = {
            tokensLimit: parseInt(headers["anthropic-ratelimit-tokens-limit"] as string) || null,
            tokensRemaining: parseInt(headers["anthropic-ratelimit-tokens-remaining"] as string) || null,
            tokensReset: (headers["anthropic-ratelimit-tokens-reset"] as string) || null,
            requestsLimit: parseInt(headers["anthropic-ratelimit-requests-limit"] as string) || null,
            requestsRemaining: parseInt(headers["anthropic-ratelimit-requests-remaining"] as string) || null,
            requestsReset: (headers["anthropic-ratelimit-requests-reset"] as string) || null,
            outputTokensLimit: parseInt(headers["anthropic-ratelimit-output-tokens-limit"] as string) || null,
            outputTokensRemaining: parseInt(headers["anthropic-ratelimit-output-tokens-remaining"] as string) || null,
            outputTokensReset: (headers["anthropic-ratelimit-output-tokens-reset"] as string) || null,
          };

          // Calculate usage percentage
          let usagePercent = 0;
          if (h.outputTokensLimit && h.outputTokensRemaining !== null) {
            usagePercent = Math.round(
              (1 - h.outputTokensRemaining / h.outputTokensLimit) * 100
            );
          } else if (h.tokensLimit && h.tokensRemaining !== null) {
            usagePercent = Math.round(
              (1 - h.tokensRemaining / h.tokensLimit) * 100
            );
          }

          // Calculate reset time string
          let resetTimeStr = "--";
          const resetTime = h.outputTokensReset || h.tokensReset;
          if (resetTime) {
            const resetDate = new Date(resetTime);
            const diffMs = resetDate.getTime() - Date.now();
            if (diffMs > 0) {
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
              resetTimeStr = `${hours}時間${mins}分後にリセット`;
            }
          }

          resolve({
            usagePercent,
            outputTokensLimit: h.outputTokensLimit,
            outputTokensRemaining: h.outputTokensRemaining,
            tokensLimit: h.tokensLimit,
            tokensRemaining: h.tokensRemaining,
            resetTimeStr,
            source: "anthropic-api",
            fetchedAt: new Date().toISOString(),
          });
        });
      }
    );

    req.on("error", reject);

    // Send minimal request (will likely fail with 400 but we get headers)
    req.write(
      JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      })
    );
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

    const result = await fetchAnthropicRateLimit(config.anthropicApiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Anthropic rate limit:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch rate limit",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
