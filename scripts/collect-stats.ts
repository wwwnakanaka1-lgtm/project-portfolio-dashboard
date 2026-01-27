/**
 * collect-stats.ts
 *
 * C:\Users\wwwhi\Create 内の全プロジェクトから統計情報を収集し、
 * src/lib/project-stats.json に出力するスクリプト
 *
 * 収集情報:
 * - コード行数（言語別）
 * - ファイル数
 * - Git統計（最終コミット日、コミット数）
 * - 依存パッケージ数
 *
 * 実行方法:
 * npx tsx scripts/collect-stats.ts
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// 定数
const CREATE_DIR = "C:\\Users\\wwwhi\\Create";
const OUTPUT_PATH = path.join(
  CREATE_DIR,
  "project-portfolio-dashboard",
  "src",
  "lib",
  "project-stats.json"
);

// 言語拡張子マッピング
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".java": "Java",
  ".go": "Go",
  ".rs": "Rust",
  ".rb": "Ruby",
  ".php": "PHP",
  ".c": "C",
  ".cpp": "C++",
  ".h": "C/C++ Header",
  ".hpp": "C++ Header",
  ".cs": "C#",
  ".swift": "Swift",
  ".kt": "Kotlin",
  ".scala": "Scala",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".xml": "XML",
  ".md": "Markdown",
  ".sql": "SQL",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".ps1": "PowerShell",
  ".bat": "Batch",
  ".cmd": "Batch",
};

// 除外するディレクトリ
const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "__pycache__",
  ".venv",
  "venv",
  "dist",
  "build",
  ".cache",
  "coverage",
  ".nyc_output",
  ".pytest_cache",
  ".mypy_cache",
  "target",
  "vendor",
  ".idea",
  ".vscode",
]);

// 除外するファイル
const EXCLUDED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Pipfile.lock",
  "poetry.lock",
]);

interface LanguageStats {
  files: number;
  lines: number;
}

interface ProjectStats {
  projectName: string;
  projectPath: string;
  languages: Record<string, LanguageStats>;
  totalFiles: number;
  totalLines: number;
  git: {
    lastCommitDate: string | null;
    commitCount: number;
    hasGit: boolean;
  };
  dependencies: {
    npm: number;
    python: number;
    total: number;
  };
  collectedAt: string;
}

interface CollectionResult {
  projects: ProjectStats[];
  summary: {
    totalProjects: number;
    totalFiles: number;
    totalLines: number;
    languageSummary: Record<string, LanguageStats>;
  };
  collectedAt: string;
}

/**
 * ファイルの行数をカウント
 */
function countLines(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

/**
 * ディレクトリを再帰的に走査してファイル情報を収集
 */
function walkDirectory(
  dir: string,
  stats: Map<string, LanguageStats>
): { files: number; lines: number } {
  let totalFiles = 0;
  let totalLines = 0;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          const subResult = walkDirectory(fullPath, stats);
          totalFiles += subResult.files;
          totalLines += subResult.lines;
        }
      } else if (entry.isFile()) {
        if (EXCLUDED_FILES.has(entry.name)) {
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        const language = LANGUAGE_EXTENSIONS[ext];

        if (language) {
          const lines = countLines(fullPath);
          totalFiles++;
          totalLines += lines;

          if (!stats.has(language)) {
            stats.set(language, { files: 0, lines: 0 });
          }
          const langStats = stats.get(language)!;
          langStats.files++;
          langStats.lines += lines;
        }
      }
    }
  } catch (error) {
    // ディレクトリ読み取りエラーは無視
  }

  return { files: totalFiles, lines: totalLines };
}

/**
 * Git統計を取得
 */
function getGitStats(projectPath: string): {
  lastCommitDate: string | null;
  commitCount: number;
  hasGit: boolean;
} {
  const gitDir = path.join(projectPath, ".git");
  if (!fs.existsSync(gitDir)) {
    return { lastCommitDate: null, commitCount: 0, hasGit: false };
  }

  try {
    // 最終コミット日を取得
    const lastCommitDate = execSync(
      'git log -1 --format="%ci" 2>/dev/null || echo ""',
      { cwd: projectPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    )
      .trim()
      .replace(/"/g, "");

    // コミット数を取得
    const commitCountStr = execSync(
      "git rev-list --count HEAD 2>/dev/null || echo 0",
      { cwd: projectPath, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    const commitCount = parseInt(commitCountStr, 10) || 0;

    return {
      lastCommitDate: lastCommitDate || null,
      commitCount,
      hasGit: true,
    };
  } catch {
    return { lastCommitDate: null, commitCount: 0, hasGit: true };
  }
}

/**
 * 依存パッケージ数を取得
 */
function getDependencyCount(projectPath: string): {
  npm: number;
  python: number;
  total: number;
} {
  let npmCount = 0;
  let pythonCount = 0;

  // package.json から npm 依存を取得
  const packageJsonPath = path.join(projectPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const deps = Object.keys(packageJson.dependencies || {}).length;
      const devDeps = Object.keys(packageJson.devDependencies || {}).length;
      npmCount = deps + devDeps;
    } catch {
      // パースエラーは無視
    }
  }

  // requirements.txt から Python 依存を取得
  const requirementsPath = path.join(projectPath, "requirements.txt");
  if (fs.existsSync(requirementsPath)) {
    try {
      const content = fs.readFileSync(requirementsPath, "utf-8");
      const lines = content
        .split("\n")
        .filter(
          (line) =>
            line.trim() && !line.trim().startsWith("#") && !line.trim().startsWith("-")
        );
      pythonCount = lines.length;
    } catch {
      // 読み取りエラーは無視
    }
  }

  // pyproject.toml からも Python 依存を取得
  const pyprojectPath = path.join(projectPath, "pyproject.toml");
  if (fs.existsSync(pyprojectPath) && pythonCount === 0) {
    try {
      const content = fs.readFileSync(pyprojectPath, "utf-8");
      // 簡易的にdependenciesセクションの行数をカウント
      const dependenciesMatch = content.match(
        /\[(?:project\.)?dependencies\]([\s\S]*?)(?:\[|$)/
      );
      if (dependenciesMatch) {
        const depLines = dependenciesMatch[1]
          .split("\n")
          .filter((line) => line.trim() && !line.trim().startsWith("#"));
        pythonCount = depLines.length;
      }
    } catch {
      // パースエラーは無視
    }
  }

  return {
    npm: npmCount,
    python: pythonCount,
    total: npmCount + pythonCount,
  };
}

/**
 * 単一プロジェクトの統計を収集
 */
function collectProjectStats(projectPath: string): ProjectStats {
  const projectName = path.basename(projectPath);
  const languageStats = new Map<string, LanguageStats>();

  console.log(`  Collecting stats for: ${projectName}`);

  // ファイル・行数の収集
  const { files, lines } = walkDirectory(projectPath, languageStats);

  // Git統計の取得
  const gitStats = getGitStats(projectPath);

  // 依存パッケージ数の取得
  const dependencies = getDependencyCount(projectPath);

  // MapをRecordに変換
  const languages: Record<string, LanguageStats> = {};
  languageStats.forEach((value, key) => {
    languages[key] = value;
  });

  return {
    projectName,
    projectPath: projectPath.replace(/\\/g, "/"),
    languages,
    totalFiles: files,
    totalLines: lines,
    git: gitStats,
    dependencies,
    collectedAt: new Date().toISOString(),
  };
}

/**
 * C:\Users\wwwhi\Create 内の全プロジェクトを収集
 */
function collectAllProjects(): CollectionResult {
  console.log(`Scanning projects in: ${CREATE_DIR}\n`);

  const projects: ProjectStats[] = [];
  const languageSummary = new Map<string, LanguageStats>();
  let totalFiles = 0;
  let totalLines = 0;

  try {
    const entries = fs.readdirSync(CREATE_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const projectPath = path.join(CREATE_DIR, entry.name);
        const stats = collectProjectStats(projectPath);
        projects.push(stats);

        totalFiles += stats.totalFiles;
        totalLines += stats.totalLines;

        // 言語サマリーを更新
        for (const [lang, langStats] of Object.entries(stats.languages)) {
          if (!languageSummary.has(lang)) {
            languageSummary.set(lang, { files: 0, lines: 0 });
          }
          const summary = languageSummary.get(lang)!;
          summary.files += langStats.files;
          summary.lines += langStats.lines;
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory: ${error}`);
  }

  // サマリーをRecordに変換
  const languageSummaryRecord: Record<string, LanguageStats> = {};
  languageSummary.forEach((value, key) => {
    languageSummaryRecord[key] = value;
  });

  return {
    projects,
    summary: {
      totalProjects: projects.length,
      totalFiles,
      totalLines,
      languageSummary: languageSummaryRecord,
    },
    collectedAt: new Date().toISOString(),
  };
}

/**
 * メイン処理
 */
function main(): void {
  console.log("=".repeat(60));
  console.log("Project Statistics Collector");
  console.log("=".repeat(60));
  console.log();

  const result = collectAllProjects();

  // 出力ディレクトリの確認
  const outputDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // JSONファイルに出力
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2), "utf-8");

  console.log();
  console.log("=".repeat(60));
  console.log("Collection Complete!");
  console.log("=".repeat(60));
  console.log();
  console.log(`Total Projects: ${result.summary.totalProjects}`);
  console.log(`Total Files: ${result.summary.totalFiles}`);
  console.log(`Total Lines: ${result.summary.totalLines.toLocaleString()}`);
  console.log();
  console.log("Language Summary:");
  const sortedLanguages = Object.entries(result.summary.languageSummary).sort(
    (a, b) => b[1].lines - a[1].lines
  );
  for (const [lang, stats] of sortedLanguages.slice(0, 10)) {
    console.log(
      `  ${lang}: ${stats.files} files, ${stats.lines.toLocaleString()} lines`
    );
  }
  console.log();
  console.log(`Output saved to: ${OUTPUT_PATH}`);
}

main();
