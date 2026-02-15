import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { parseSessionStateBackup, type SessionStateBackupV2 } from "@/lib/session-state-backup";

interface BackupEnvelope {
  version: 1;
  savedAt: string;
  source: "auto" | "manual-export" | "manual-import";
  backup: SessionStateBackupV2;
}

const BACKUP_DIR = path.join(process.cwd(), "backups");
const LATEST_FILE = "session-state-latest.json";

function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function getTodayFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `session-state-${y}${m}${d}.json`;
}

function readBackupEnvelope(filePath: string): BackupEnvelope | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as BackupEnvelope;
    if (!parsed || parsed.version !== 1 || typeof parsed.savedAt !== "string" || !parsed.backup) {
      return null;
    }
    const normalized = parseSessionStateBackup(JSON.stringify(parsed.backup));
    if (!normalized) {
      return null;
    }
    return {
      version: 1,
      savedAt: parsed.savedAt,
      source: parsed.source ?? "auto",
      backup: normalized,
    };
  } catch {
    return null;
  }
}

function findLatestBackupEnvelope(): { fileName: string; envelope: BackupEnvelope } | null {
  ensureBackupDir();

  const latestPath = path.join(BACKUP_DIR, LATEST_FILE);
  const latest = readBackupEnvelope(latestPath);
  if (latest) {
    return { fileName: LATEST_FILE, envelope: latest };
  }

  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((file) => /^session-state-\d{8}\.json$/.test(file))
    .map((fileName) => ({
      fileName,
      filePath: path.join(BACKUP_DIR, fileName),
      mtimeMs: fs.statSync(path.join(BACKUP_DIR, fileName)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const file of files) {
    const envelope = readBackupEnvelope(file.filePath);
    if (envelope) {
      return { fileName: file.fileName, envelope };
    }
  }

  return null;
}

export async function GET() {
  try {
    const latest = findLatestBackupEnvelope();
    if (!latest) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      fileName: latest.fileName,
      savedAt: latest.envelope.savedAt,
      source: latest.envelope.source,
      backup: latest.envelope.backup,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to read session state backup",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureBackupDir();

    const body = (await request.json()) as { source?: BackupEnvelope["source"]; backup?: unknown };
    const source = body.source ?? "auto";
    const rawBackupPayload = body.backup ?? body;
    const normalized = parseSessionStateBackup(JSON.stringify(rawBackupPayload));

    if (!normalized) {
      return NextResponse.json({ error: "Invalid backup payload" }, { status: 400 });
    }

    const now = new Date();
    const envelope: BackupEnvelope = {
      version: 1,
      savedAt: now.toISOString(),
      source,
      backup: normalized,
    };

    const dailyFileName = getTodayFileName(now);
    const dailyPath = path.join(BACKUP_DIR, dailyFileName);
    const latestPath = path.join(BACKUP_DIR, LATEST_FILE);

    const serialized = JSON.stringify(envelope, null, 2);
    fs.writeFileSync(dailyPath, serialized, "utf8");
    fs.writeFileSync(latestPath, serialized, "utf8");

    return NextResponse.json({
      ok: true,
      fileName: dailyFileName,
      savedAt: envelope.savedAt,
      source: envelope.source,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to write session state backup",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

