import { NextResponse } from "next/server";
import {
  getSnapshotDir,
  loadAllSnapshots,
  saveSnapshot,
  type UsageSnapshotData,
} from "@/lib/usage-snapshot";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = getSnapshotDir();

    if (!fs.existsSync(dir)) {
      return NextResponse.json({ exists: false, snapshotCount: 0 });
    }

    const files = fs.readdirSync(dir).filter(
      (f) => f.startsWith("usage-snapshot-") && f.endsWith(".json") && f !== "usage-snapshot-latest.json"
    );

    // Read latest snapshot metadata
    const latestPath = path.join(dir, "usage-snapshot-latest.json");
    let latestInfo: { fileName: string; savedAt: string } | null = null;

    if (fs.existsSync(latestPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(latestPath, "utf8"));
        latestInfo = {
          fileName: `usage-snapshot-${raw.snapshotDate}.json`,
          savedAt: raw.savedAt,
        };
      } catch {
        // Skip corrupted latest file
      }
    }

    return NextResponse.json({
      exists: files.length > 0,
      snapshotCount: files.length,
      latest: latestInfo,
      files: files.sort(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read snapshots", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source = body.source || "manual";

    // If data is provided, use it directly; otherwise compute from usage-stats
    let data: UsageSnapshotData;

    if (body.data?.dailyActivity) {
      data = body.data;
    } else {
      // Import and compute live stats
      const snapshots = loadAllSnapshots();
      if (snapshots.length === 0) {
        return NextResponse.json(
          { error: "No data available to snapshot" },
          { status: 400 }
        );
      }
      // Use the latest snapshot data
      data = snapshots[snapshots.length - 1];
    }

    const result = saveSnapshot(data);

    return NextResponse.json({
      ok: true,
      source,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save snapshot", details: String(error) },
      { status: 500 }
    );
  }
}
