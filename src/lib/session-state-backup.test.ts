import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSessionStateBackup,
  getSessionStateFingerprint,
  mergeSessionStateBackup,
  parseSessionStateBackup,
} from "./session-state-backup";

test("parseSessionStateBackup parses v2 payload", () => {
  const raw = JSON.stringify({
    version: 2,
    exportedAt: "2026-02-15T00:00:00.000Z",
    claudeTitles: { "claude:a": "A" },
    codexTitles: { "codex:b": "B" },
    manualTasks: [
      {
        id: "task-1",
        name: "Task 1",
        status: "pending",
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T00:00:00.000Z",
      },
    ],
    themePreference: "dark",
    displaySettings: {
      activeTab: "history",
      pastCollapsed: false,
    },
  });

  const parsed = parseSessionStateBackup(raw);
  assert.ok(parsed);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.claudeTitles["claude:a"], "A");
  assert.equal(parsed.codexTitles["codex:b"], "B");
  assert.equal(parsed.manualTasks.length, 1);
  assert.equal(parsed.themePreference, "dark");
  assert.equal(parsed.displaySettings.activeTab, "history");
});

test("parseSessionStateBackup supports v1 title-only backup", () => {
  const raw = JSON.stringify({
    version: 1,
    exportedAt: "2026-02-15T00:00:00.000Z",
    claudeTitles: { "legacy-id": "Legacy" },
    codexTitles: { "codex:x": "X" },
  });

  const parsed = parseSessionStateBackup(raw);
  assert.ok(parsed);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.claudeTitles["claude:legacy-id"], "Legacy");
  assert.equal(parsed.codexTitles["codex:x"], "X");
  assert.equal(parsed.manualTasks.length, 0);
  assert.equal(parsed.displaySettings.activeTab, "claude");
});

test("mergeSessionStateBackup merges titles and tasks", () => {
  const current = buildSessionStateBackup({
    claudeTitles: { "claude:old": "Old" },
    codexTitles: { "codex:old": "OldC" },
    manualTasks: [
      {
        id: "task-1",
        name: "Task 1",
        status: "pending",
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T00:00:00.000Z",
      },
    ],
    themePreference: "light",
    displaySettings: { activeTab: "claude", pastCollapsed: true },
    exportedAt: "2026-02-15T00:00:00.000Z",
  });

  const imported = buildSessionStateBackup({
    claudeTitles: { "claude:new": "New", "codex:new-codex": "NewCodexViaClaudeMap" },
    codexTitles: { "codex:new": "NewCodex" },
    manualTasks: [
      {
        id: "task-2",
        name: "Task 2",
        status: "completed",
        createdAt: "2026-02-15T00:00:00.000Z",
        updatedAt: "2026-02-15T01:00:00.000Z",
      },
    ],
    themePreference: "dark",
    displaySettings: { activeTab: "manual", pastCollapsed: false },
    exportedAt: "2026-02-15T01:00:00.000Z",
  });

  const merged = mergeSessionStateBackup(current, imported);
  assert.equal(merged.claudeTitles["claude:old"], "Old");
  assert.equal(merged.claudeTitles["claude:new"], "New");
  assert.equal(merged.codexTitles["codex:new"], "NewCodex");
  assert.equal(merged.manualTasks.length, 2);
  assert.equal(merged.themePreference, "dark");
  assert.equal(merged.displaySettings.activeTab, "manual");
});

test("getSessionStateFingerprint is stable for equivalent maps", () => {
  const first = buildSessionStateBackup({
    claudeTitles: { "claude:b": "B", "claude:a": "A" },
    codexTitles: { "codex:b": "B", "codex:a": "A" },
    manualTasks: [],
    themePreference: "system",
    displaySettings: { activeTab: "codex", pastCollapsed: true },
    exportedAt: "2026-02-15T00:00:00.000Z",
  });
  const second = buildSessionStateBackup({
    claudeTitles: { "claude:a": "A", "claude:b": "B" },
    codexTitles: { "codex:a": "A", "codex:b": "B" },
    manualTasks: [],
    themePreference: "system",
    displaySettings: { activeTab: "codex", pastCollapsed: true },
    exportedAt: "2026-02-15T05:00:00.000Z",
  });

  assert.equal(getSessionStateFingerprint(first), getSessionStateFingerprint(second));
});

test("parseSessionStateBackup defaults display settings when missing", () => {
  const raw = JSON.stringify({
    version: 2,
    exportedAt: "2026-02-15T00:00:00.000Z",
    claudeTitles: {},
    codexTitles: {},
    manualTasks: [],
    themePreference: null,
  });

  const parsed = parseSessionStateBackup(raw);
  assert.ok(parsed);
  assert.equal(parsed.displaySettings.activeTab, "claude");
  assert.equal(parsed.displaySettings.pastCollapsed, true);
});
