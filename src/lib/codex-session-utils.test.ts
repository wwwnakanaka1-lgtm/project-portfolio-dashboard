import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { parsePlanProgress, walkJsonlFiles } from "./codex-session-utils";

test("parsePlanProgress parses plan steps and completion percent", () => {
  const raw = JSON.stringify({
    explanation: "test",
    plan: [
      { step: "step 1", status: "completed" },
      { step: "step 2", status: "in_progress" },
      { step: "step 3", status: "pending" },
    ],
  });

  const parsed = parsePlanProgress(raw, "2026-02-14T00:00:00.000Z");
  assert.ok(parsed);
  assert.equal(parsed.total, 3);
  assert.equal(parsed.completed, 1);
  assert.equal(parsed.inProgress, 1);
  assert.equal(parsed.pending, 1);
  assert.equal(parsed.percent, 33);
});

test("parsePlanProgress returns null for invalid or empty plan payload", () => {
  assert.equal(parsePlanProgress("{}", "2026-02-14T00:00:00.000Z"), null);
  assert.equal(parsePlanProgress("not-json", "2026-02-14T00:00:00.000Z"), null);
  assert.equal(parsePlanProgress(JSON.stringify({ plan: [] }), "2026-02-14T00:00:00.000Z"), null);
});

test("parsePlanProgress maps unknown status into pending bucket", () => {
  const raw = JSON.stringify({
    plan: [
      { step: "step 1", status: "completed" },
      { step: "step 2", status: "something_else" },
    ],
  });

  const parsed = parsePlanProgress(raw, "2026-02-14T00:00:00.000Z");
  assert.ok(parsed);
  assert.equal(parsed.pending, 1);
  assert.equal(parsed.steps[1].status, "unknown");
});

test("walkJsonlFiles discovers nested jsonl files only", () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-walk-"));
  try {
    const nestedDir = path.join(baseDir, "a", "b");
    fs.mkdirSync(nestedDir, { recursive: true });

    const jsonl1 = path.join(baseDir, "root.jsonl");
    const jsonl2 = path.join(nestedDir, "nested.jsonl");
    const txt = path.join(baseDir, "ignore.txt");

    fs.writeFileSync(jsonl1, "{}\n", "utf8");
    fs.writeFileSync(jsonl2, "{}\n", "utf8");
    fs.writeFileSync(txt, "noop\n", "utf8");

    const result = walkJsonlFiles(baseDir);
    const discovered = new Set(result.files.map((file) => path.basename(file)));

    assert.equal(result.reachedLimit, false);
    assert.equal(discovered.has("root.jsonl"), true);
    assert.equal(discovered.has("nested.jsonl"), true);
    assert.equal(discovered.has("ignore.txt"), false);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});

test("walkJsonlFiles stops when maxFiles limit is reached", () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-walk-limit-"));
  try {
    fs.writeFileSync(path.join(baseDir, "a.jsonl"), "{}\n", "utf8");
    fs.writeFileSync(path.join(baseDir, "b.jsonl"), "{}\n", "utf8");
    fs.writeFileSync(path.join(baseDir, "c.jsonl"), "{}\n", "utf8");

    const result = walkJsonlFiles(baseDir, { maxFiles: 2 });
    assert.equal(result.reachedLimit, true);
    assert.equal(result.files.length, 2);
  } finally {
    fs.rmSync(baseDir, { recursive: true, force: true });
  }
});
