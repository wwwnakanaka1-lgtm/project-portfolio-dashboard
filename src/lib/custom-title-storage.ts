export const CLAUDE_CUSTOM_TITLES_STORAGE_KEY = "claude-custom-titles";
export const CODEX_CUSTOM_TITLES_STORAGE_KEY = "codex-custom-titles";
export const CLAUDE_CUSTOM_TITLES_UPDATED_EVENT = "claude-custom-titles-updated";
export const CODEX_CUSTOM_TITLES_UPDATED_EVENT = "codex-custom-titles-updated";

interface HydratedTitleMaps {
  claudeTitles: Record<string, string>;
  codexTitles: Record<string, string>;
  claudeChanged: boolean;
  codexChanged: boolean;
}

export interface TitleBackupV1 {
  version: 1;
  exportedAt: string;
  claudeTitles: Record<string, string>;
  codexTitles: Record<string, string>;
}

function shallowEqualStringMap(a: Record<string, string>, b: Record<string, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  for (const key of aKeys) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTitleMap(raw: string | null): Record<string, string> {
  if (!raw) {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string" && value.trim().length > 0) {
      result[key] = value.trim();
    }
  }
  return result;
}

export function normalizeClaudeTitles(raw: Record<string, string>): { titles: Record<string, string>; changed: boolean } {
  const titles: Record<string, string> = {};
  let changed = false;
  for (const [key, value] of Object.entries(raw)) {
    if (!value) {
      changed = true;
      continue;
    }
    titles[key] = value;
    if (!key.includes(":")) {
      const namespaced = `claude:${key}`;
      if (!titles[namespaced]) {
        titles[namespaced] = value;
        changed = true;
      }
    }
  }

  if (!changed && !shallowEqualStringMap(raw, titles)) {
    changed = true;
  }
  return { titles, changed };
}

export function normalizeCodexTitles(raw: Record<string, string>): { titles: Record<string, string>; changed: boolean } {
  const titles: Record<string, string> = {};
  let changed = false;
  for (const [key, value] of Object.entries(raw)) {
    if (!value) {
      changed = true;
      continue;
    }
    if (!key.startsWith("codex:")) {
      changed = true;
      continue;
    }
    titles[key] = value;
  }

  if (!changed && !shallowEqualStringMap(raw, titles)) {
    changed = true;
  }
  return { titles, changed };
}

export function extractCodexTitles(raw: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("codex:") && value) {
      result[key] = value;
    }
  }
  return result;
}

export function hydrateTitleMaps(
  rawClaudeTitles: Record<string, string>,
  rawCodexTitles: Record<string, string>
): HydratedTitleMaps {
  const normalizedClaude = normalizeClaudeTitles(rawClaudeTitles).titles;
  const normalizedCodex = normalizeCodexTitles(rawCodexTitles).titles;

  const mergedClaude = {
    ...normalizedClaude,
    ...normalizedCodex,
  };
  const finalizedClaude = normalizeClaudeTitles(mergedClaude).titles;
  const finalizedCodex = normalizeCodexTitles({
    ...extractCodexTitles(finalizedClaude),
    ...normalizedCodex,
  }).titles;

  return {
    claudeTitles: finalizedClaude,
    codexTitles: finalizedCodex,
    claudeChanged: !shallowEqualStringMap(rawClaudeTitles, finalizedClaude),
    codexChanged: !shallowEqualStringMap(rawCodexTitles, finalizedCodex),
  };
}

export function buildTitleBackup(claudeTitles: Record<string, string>, codexTitles: Record<string, string>): TitleBackupV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    claudeTitles: normalizeClaudeTitles(claudeTitles).titles,
    codexTitles: normalizeCodexTitles(codexTitles).titles,
  };
}

export function parseTitleBackup(raw: string): TitleBackupV1 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed)) {
    return null;
  }
  if (parsed.version !== 1) {
    return null;
  }

  const claudeTitles = isRecord(parsed.claudeTitles)
    ? parseTitleMap(JSON.stringify(parsed.claudeTitles))
    : {};
  const codexTitles = isRecord(parsed.codexTitles)
    ? parseTitleMap(JSON.stringify(parsed.codexTitles))
    : {};

  return {
    version: 1,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    claudeTitles: normalizeClaudeTitles(claudeTitles).titles,
    codexTitles: normalizeCodexTitles(codexTitles).titles,
  };
}

export function mergeImportedTitleBackup(
  rawClaudeTitles: Record<string, string>,
  rawCodexTitles: Record<string, string>,
  backup: TitleBackupV1
): { claudeTitles: Record<string, string>; codexTitles: Record<string, string> } {
  const merged = hydrateTitleMaps(
    {
      ...rawClaudeTitles,
      ...backup.claudeTitles,
      ...backup.codexTitles,
    },
    {
      ...rawCodexTitles,
      ...backup.codexTitles,
      ...extractCodexTitles(backup.claudeTitles),
    }
  );

  return {
    claudeTitles: merged.claudeTitles,
    codexTitles: merged.codexTitles,
  };
}

