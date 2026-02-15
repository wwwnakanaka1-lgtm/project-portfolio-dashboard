import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTitleBackup,
  extractCodexTitles,
  hydrateTitleMaps,
  mergeImportedTitleBackup,
  normalizeClaudeTitles,
  normalizeCodexTitles,
  parseTitleBackup,
  parseTitleMap,
} from "./custom-title-storage";

test("normalizeClaudeTitles migrates legacy non-namespaced keys", () => {
  const result = normalizeClaudeTitles({
    "abc-session": "Legacy title",
    "codex:def-session": "Codex title",
  });

  assert.equal(result.titles["abc-session"], "Legacy title");
  assert.equal(result.titles["claude:abc-session"], "Legacy title");
  assert.equal(result.titles["codex:def-session"], "Codex title");
  assert.equal(result.changed, true);
});

test("normalizeCodexTitles keeps codex keys only", () => {
  const result = normalizeCodexTitles({
    "codex:a": "A",
    "claude:b": "B",
    "legacy": "C",
  });

  assert.deepEqual(result.titles, { "codex:a": "A" });
  assert.equal(result.changed, true);
});

test("parseTitleMap filters invalid values", () => {
  const parsed = parseTitleMap(JSON.stringify({ a: "A", b: "", c: 1, d: " D " }));
  assert.deepEqual(parsed, { a: "A", d: "D" });
});

test("hydrateTitleMaps syncs codex titles into both maps", () => {
  const hydrated = hydrateTitleMaps(
    {
      "claude:one": "One",
    },
    {
      "codex:two": "Two",
    }
  );

  assert.equal(hydrated.claudeTitles["claude:one"], "One");
  assert.equal(hydrated.claudeTitles["codex:two"], "Two");
  assert.equal(hydrated.codexTitles["codex:two"], "Two");
});

test("buildTitleBackup + parseTitleBackup roundtrip", () => {
  const backup = buildTitleBackup(
    {
      "legacy-id": "Legacy",
      "claude:session-x": "Claude X",
    },
    {
      "codex:session-y": "Codex Y",
    }
  );
  const parsed = parseTitleBackup(JSON.stringify(backup));
  assert.ok(parsed);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.claudeTitles["claude:session-x"], "Claude X");
  assert.equal(parsed.claudeTitles["claude:legacy-id"], "Legacy");
  assert.equal(parsed.codexTitles["codex:session-y"], "Codex Y");
});

test("parseTitleBackup returns null for invalid payload", () => {
  assert.equal(parseTitleBackup("not-json"), null);
  assert.equal(parseTitleBackup(JSON.stringify({ version: 2 })), null);
});

test("mergeImportedTitleBackup merges both provider titles", () => {
  const backup = buildTitleBackup(
    {
      "claude:new-session": "New Claude",
      "codex:shared-codex": "Shared Codex",
    },
    {
      "codex:new-codex": "New Codex",
    }
  );

  const merged = mergeImportedTitleBackup(
    { "claude:old-session": "Old Claude" },
    { "codex:old-codex": "Old Codex" },
    backup
  );

  assert.equal(merged.claudeTitles["claude:old-session"], "Old Claude");
  assert.equal(merged.claudeTitles["claude:new-session"], "New Claude");
  assert.equal(merged.claudeTitles["codex:new-codex"], "New Codex");
  assert.equal(merged.codexTitles["codex:old-codex"], "Old Codex");
  assert.equal(merged.codexTitles["codex:new-codex"], "New Codex");
  assert.deepEqual(extractCodexTitles(merged.claudeTitles), merged.codexTitles);
});

