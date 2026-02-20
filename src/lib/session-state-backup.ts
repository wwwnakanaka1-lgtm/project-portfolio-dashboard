import {
  buildTitleBackup,
  mergeImportedTitleBackup,
  parseTitleBackup,
} from "./custom-title-storage";

export type ActiveTab = "claude" | "codex" | "history" | "manual";
export type ThemePreference = "light" | "dark" | "system" | null;

export interface BackupManualTask {
  id: string;
  name: string;
  description?: string;
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface BackupDisplaySettings {
  activeTab: ActiveTab;
  pastCollapsed: boolean;
}

export interface SessionStateBackupV2 {
  version: 2;
  exportedAt: string;
  claudeTitles: Record<string, string>;
  codexTitles: Record<string, string>;
  manualTasks: BackupManualTask[];
  themePreference: ThemePreference;
  displaySettings: BackupDisplaySettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeActiveTab(value: unknown): ActiveTab {
  if (value === "claude" || value === "codex" || value === "history" || value === "manual") {
    return value;
  }
  return "claude";
}

function normalizeThemePreference(value: unknown): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

function normalizeManualTask(value: unknown): BackupManualTask | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    (value.status !== "pending" && value.status !== "in_progress" && value.status !== "completed") ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === "string" ? value.description : undefined,
    status: value.status,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function sortStringMap(map: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(map).sort()) {
    result[key] = map[key];
  }
  return result;
}

function dedupeAndSortTasks(tasks: BackupManualTask[]): BackupManualTask[] {
  const latestById = new Map<string, BackupManualTask>();
  for (const task of tasks) {
    const existing = latestById.get(task.id);
    if (!existing || task.updatedAt >= existing.updatedAt) {
      latestById.set(task.id, task);
    }
  }
  return Array.from(latestById.values()).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

export function buildSessionStateBackup(input: {
  claudeTitles: Record<string, string>;
  codexTitles: Record<string, string>;
  manualTasks: BackupManualTask[];
  themePreference: ThemePreference;
  displaySettings: BackupDisplaySettings;
  exportedAt?: string;
}): SessionStateBackupV2 {
  const titles = buildTitleBackup(input.claudeTitles, input.codexTitles);
  return {
    version: 2,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    claudeTitles: sortStringMap(titles.claudeTitles),
    codexTitles: sortStringMap(titles.codexTitles),
    manualTasks: dedupeAndSortTasks(input.manualTasks),
    themePreference: normalizeThemePreference(input.themePreference),
    displaySettings: {
      activeTab: normalizeActiveTab(input.displaySettings.activeTab),
      pastCollapsed: Boolean(input.displaySettings.pastCollapsed),
    },
  };
}

export function parseSessionStateBackup(raw: string): SessionStateBackupV2 | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  if (parsed.version === 2) {
    const titleBackup = parseTitleBackup(
      JSON.stringify({
        version: 1,
        exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
        claudeTitles: isRecord(parsed.claudeTitles) ? parsed.claudeTitles : {},
        codexTitles: isRecord(parsed.codexTitles) ? parsed.codexTitles : {},
      })
    );

    if (!titleBackup) {
      return null;
    }

    const tasksRaw = Array.isArray(parsed.manualTasks) ? parsed.manualTasks : [];
    const manualTasks = tasksRaw.map(normalizeManualTask).filter((task): task is BackupManualTask => task !== null);

    return buildSessionStateBackup({
      claudeTitles: titleBackup.claudeTitles,
      codexTitles: titleBackup.codexTitles,
      manualTasks,
      themePreference: normalizeThemePreference(parsed.themePreference),
      displaySettings: {
        activeTab: normalizeActiveTab(
          isRecord(parsed.displaySettings) ? parsed.displaySettings.activeTab : undefined
        ),
        pastCollapsed:
          isRecord(parsed.displaySettings) && typeof parsed.displaySettings.pastCollapsed === "boolean"
            ? parsed.displaySettings.pastCollapsed
            : true,
      },
      exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    });
  }

  // Backward compatibility: title-only backup (version 1).
  const titleBackup = parseTitleBackup(raw);
  if (!titleBackup) {
    return null;
  }

  return buildSessionStateBackup({
    claudeTitles: titleBackup.claudeTitles,
    codexTitles: titleBackup.codexTitles,
    manualTasks: [],
    themePreference: null,
    displaySettings: {
      activeTab: "claude",
      pastCollapsed: true,
    },
    exportedAt: titleBackup.exportedAt,
  });
}

export function mergeSessionStateBackup(
  current: SessionStateBackupV2,
  imported: SessionStateBackupV2
): SessionStateBackupV2 {
  const mergedTitles = mergeImportedTitleBackup(
    current.claudeTitles,
    current.codexTitles,
    buildTitleBackup(imported.claudeTitles, imported.codexTitles)
  );

  return buildSessionStateBackup({
    claudeTitles: mergedTitles.claudeTitles,
    codexTitles: mergedTitles.codexTitles,
    manualTasks: [...current.manualTasks, ...imported.manualTasks],
    themePreference: imported.themePreference ?? current.themePreference,
    displaySettings: {
      activeTab: imported.displaySettings.activeTab ?? current.displaySettings.activeTab,
      pastCollapsed: imported.displaySettings.pastCollapsed,
    },
    exportedAt: new Date().toISOString(),
  });
}

export function getSessionStateFingerprint(state: SessionStateBackupV2): string {
  return JSON.stringify({
    claudeTitles: sortStringMap(state.claudeTitles),
    codexTitles: sortStringMap(state.codexTitles),
    manualTasks: dedupeAndSortTasks(state.manualTasks),
    themePreference: state.themePreference,
    displaySettings: {
      activeTab: state.displaySettings.activeTab,
      pastCollapsed: state.displaySettings.pastCollapsed,
    },
  });
}
