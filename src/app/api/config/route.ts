import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

interface DashboardConfig {
  anthropicApiKey: string | null;
  keyType: "admin" | "standard" | "oauth" | "unknown" | null;
  updatedAt?: string;
}

function getConfigPath(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, ".claude", "dashboard-config.json");
}

function loadConfig(): DashboardConfig {
  const configPath = getConfigPath();

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

function saveConfig(config: DashboardConfig): boolean {
  const configPath = getConfigPath();

  try {
    // Detect key type
    if (config.anthropicApiKey) {
      if (config.anthropicApiKey.startsWith("sk-ant-admin")) {
        config.keyType = "admin";
      } else if (config.anthropicApiKey.startsWith("sk-ant-api")) {
        config.keyType = "standard";
      } else if (config.anthropicApiKey.startsWith("sk-ant-oat")) {
        config.keyType = "oauth"; // OAuth Access Token (tied to Max plan)
      } else {
        config.keyType = "unknown";
      }
    } else {
      config.keyType = null;
    }

    config.updatedAt = new Date().toISOString();

    // Ensure directory exists
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error("Error saving config:", err);
    return false;
  }
}

// GET - Read config (masked API key)
export async function GET() {
  try {
    const config = loadConfig();

    // Mask API key for security
    let maskedKey: string | null = null;
    if (config.anthropicApiKey) {
      const key = config.anthropicApiKey;
      if (key.length > 12) {
        maskedKey = key.substring(0, 12) + "..." + key.substring(key.length - 4);
      } else {
        maskedKey = "****";
      }
    }

    return NextResponse.json({
      hasApiKey: !!config.anthropicApiKey,
      maskedKey,
      keyType: config.keyType,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config", details: String(error) },
      { status: 500 }
    );
  }
}

// POST - Update config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { anthropicApiKey } = body;

    const config: DashboardConfig = {
      anthropicApiKey: anthropicApiKey || null,
      keyType: null,
    };

    const success = saveConfig(config);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save config" },
        { status: 500 }
      );
    }

    // Return updated config
    const updatedConfig = loadConfig();

    let maskedKey: string | null = null;
    if (updatedConfig.anthropicApiKey) {
      const key = updatedConfig.anthropicApiKey;
      if (key.length > 12) {
        maskedKey = key.substring(0, 12) + "..." + key.substring(key.length - 4);
      } else {
        maskedKey = "****";
      }
    }

    return NextResponse.json({
      success: true,
      hasApiKey: !!updatedConfig.anthropicApiKey,
      maskedKey,
      keyType: updatedConfig.keyType,
      updatedAt: updatedConfig.updatedAt,
    });
  } catch (error) {
    console.error("Error saving config:", error);
    return NextResponse.json(
      { error: "Failed to save config", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE - Remove API key
export async function DELETE() {
  try {
    const config: DashboardConfig = {
      anthropicApiKey: null,
      keyType: null,
    };

    const success = saveConfig(config);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete config" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      hasApiKey: false,
      maskedKey: null,
      keyType: null,
    });
  } catch (error) {
    console.error("Error deleting config:", error);
    return NextResponse.json(
      { error: "Failed to delete config", details: String(error) },
      { status: 500 }
    );
  }
}
