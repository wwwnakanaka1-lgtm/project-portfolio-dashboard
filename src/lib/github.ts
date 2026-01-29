import { GitHubStats, GitHubCacheEntry, GitHubCache, GitHubError } from "./types";

// キャッシュの有効期限（5分 = 300000ms）
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_KEY = "github_stats_cache";

/**
 * localStorageからキャッシュを取得
 */
function getCache(): GitHubCache {
  if (typeof window === "undefined") return {};
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * localStorageにキャッシュを保存
 */
function setCache(cache: GitHubCache): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * 特定リポジトリのキャッシュを取得（期限切れチェック付き）
 */
function getCachedStats(repo: string): GitHubStats | null {
  const cache = getCache();
  const entry = cache[repo];
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    // キャッシュ期限切れ
    return null;
  }
  return entry.data;
}

/**
 * キャッシュに保存
 */
function setCachedStats(repo: string, stats: GitHubStats): void {
  const cache = getCache();
  cache[repo] = {
    data: stats,
    timestamp: Date.now(),
  };
  setCache(cache);
}

/**
 * GitHub REST APIからリポジトリ情報を取得
 */
async function fetchRepoInfo(repo: string): Promise<{
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  defaultBranch: string;
  language: string | null;
  description: string | null;
}> {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    const error: GitHubError = {
      message: `Failed to fetch repository: ${response.statusText}`,
      status: response.status,
    };
    throw error;
  }

  const data = await response.json();
  return {
    stars: data.stargazers_count,
    forks: data.forks_count,
    openIssues: data.open_issues_count, // Note: これはissues + PRの合計
    watchers: data.watchers_count,
    defaultBranch: data.default_branch,
    language: data.language,
    description: data.description,
  };
}

/**
 * GitHub REST APIからオープンPR数を取得
 */
async function fetchOpenPRCount(repo: string): Promise<number> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/pulls?state=open&per_page=1`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    return 0;
  }

  // Link headerからtotal countを取得（存在する場合）
  const linkHeader = response.headers.get("Link");
  if (linkHeader) {
    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  // Link headerがない場合は結果の配列長を使用
  const data = await response.json();
  return Array.isArray(data) ? data.length : 0;
}

/**
 * GitHub REST APIから最新コミット情報を取得
 */
async function fetchLatestCommit(
  repo: string,
  branch: string
): Promise<{ date: string | null; message: string | null }> {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/commits?sha=${branch}&per_page=1`,
    {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    return { date: null, message: null };
  }

  const data = await response.json();
  if (Array.isArray(data) && data.length > 0) {
    const commit = data[0];
    return {
      date: commit.commit?.committer?.date || null,
      message: commit.commit?.message?.split("\n")[0] || null, // 1行目のみ
    };
  }
  return { date: null, message: null };
}

/**
 * GitHub統計情報を取得（キャッシュ優先）
 */
export async function fetchGitHubStats(repo: string): Promise<GitHubStats | null> {
  // キャッシュをチェック
  const cached = getCachedStats(repo);
  if (cached) {
    return cached;
  }

  try {
    // リポジトリ基本情報を取得
    const repoInfo = await fetchRepoInfo(repo);

    // PR数と最新コミットを並列取得
    const [openPRs, latestCommit] = await Promise.all([
      fetchOpenPRCount(repo),
      fetchLatestCommit(repo, repoInfo.defaultBranch),
    ]);

    // open_issues_countはissues + PRsの合計なので、実際のissue数を計算
    const actualOpenIssues = Math.max(0, repoInfo.openIssues - openPRs);

    const stats: GitHubStats = {
      stars: repoInfo.stars,
      forks: repoInfo.forks,
      openIssues: actualOpenIssues,
      openPRs,
      lastCommitDate: latestCommit.date,
      lastCommitMessage: latestCommit.message,
      watchers: repoInfo.watchers,
      defaultBranch: repoInfo.defaultBranch,
      language: repoInfo.language,
      description: repoInfo.description,
    };

    // キャッシュに保存
    setCachedStats(repo, stats);

    return stats;
  } catch (error) {
    console.error(`Failed to fetch GitHub stats for ${repo}:`, error);
    return null;
  }
}

/**
 * キャッシュをクリア
 */
export function clearGitHubCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

/**
 * 特定リポジトリのキャッシュをクリア
 */
export function clearRepoCache(repo: string): void {
  const cache = getCache();
  delete cache[repo];
  setCache(cache);
}

/**
 * 日付を相対表示に変換（例: "2 days ago"）
 */
export function formatRelativeDate(dateString: string | null): string {
  if (!dateString) return "不明";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? "たった今" : `${diffMinutes}分前`;
    }
    return `${diffHours}時間前`;
  } else if (diffDays === 1) {
    return "昨日";
  } else if (diffDays < 7) {
    return `${diffDays}日前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}週間前`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}ヶ月前`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}年前`;
  }
}

/**
 * 数値をフォーマット（1000以上はK表記）
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}
