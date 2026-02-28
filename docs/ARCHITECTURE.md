# Architecture Overview

## System Design

Frontend-only single-page application built with Next.js 16. The app uses Next.js API routes as a thin server-side layer for filesystem access (reading JSONL session files, discovering projects) and proxying external API calls (Anthropic Admin API, GitHub API, exchange rates). No database is required -- all user preferences and state are persisted in localStorage.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│                                                              │
│  page.tsx (Tab Orchestrator)                                 │
│  ├── ClaudeMonitor  ← /api/sessions, /api/usage-stats       │
│  ├── Overview       ← static projects.json + /api/projects-catalog │
│  ├── Graph          ← project data (client-side D3 rendering)│
│  └── UsageStats     ← /api/anthropic/usage, /api/project-costs │
│                                                              │
│  localStorage: titles, favorites, tasks, theme, budget,      │
│                GitHub cache, usage snapshots                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ fetch()
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js API Routes (Server)                │
│                                                              │
│  /api/sessions          → Parse JSONL session files          │
│  /api/projects-catalog  → Scan filesystem for projects       │
│  /api/anthropic/*       → Proxy to Anthropic Admin API       │
│  /api/config            → Read/write API keys to disk        │
│  /api/usage-stats       → Aggregate token/cost data          │
│  /api/project-costs     → Per-project cost breakdown         │
│  /api/codex-sessions    → Parse Codex session files          │
│  /api/usage-snapshots   → Historical usage data              │
│  /api/session-state-backup → Export/import session state     │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   JSONL Files      Anthropic API       GitHub API
   (sessions)       (usage, limits)     (repo stats)
```

### Data Sources

1. **JSONL Session Files** -- Claude Code and Codex write session logs as JSONL files on the local filesystem. API routes parse these files to extract token counts, costs, and session metadata.
2. **Anthropic Admin API** -- Provides billing usage data and rate limit status. Requires an Admin API key configured via the Settings modal or environment variable.
3. **GitHub API** -- Fetches repository statistics (stars, forks, issues, PRs) for projects with a configured `githubRepo` field.
4. **Exchange Rate API** -- Fetches live USD/JPY conversion rates for multi-currency cost display. Cached for 24 hours.
5. **Filesystem Scanning** -- The `/api/projects-catalog` route scans the Create directory to auto-discover projects, reading package.json, git history, and file statistics.

## Caching Strategy

| Layer | TTL | Purpose |
|-------|-----|---------|
| In-memory (`api-cache.ts`) | 5-60s | API route response caching to avoid re-parsing files on rapid requests |
| File mtime cache | Per-request | Skip re-parsing JSONL files that haven't been modified since last read |
| localStorage (GitHub) | 5 min | Cache GitHub API responses to stay within rate limits |
| localStorage (preferences) | Permanent | User preferences: custom titles, favorites, theme, budget settings |
| Exchange rate | 24h | USD/JPY conversion rate cached to minimize external API calls |
| Usage snapshots | Permanent | Historical usage data points stored for trend analysis |

## Component Architecture

### Page Layout (page.tsx)

The main page acts as a tab orchestrator with four views:

- **Sessions** (`ClaudeMonitor`): Real-time monitoring of Claude Code and Codex sessions. Always mounted (hidden via CSS when inactive) to preserve state across tab switches.
- **Overview** (`CategoryChart` + `TechChart` + `ProjectTable`): Project portfolio visualization with category/technology charts and a searchable, sortable project table.
- **Graph** (`RelationshipGraph`): D3.js force-directed graph showing relationships between projects based on shared technologies.
- **Usage & Cost** (`UsageStats`): Cost analytics with charts, anomaly detection, and monthly forecasting.

### Claude Session Monitoring (`components/claude/`)

The largest component group (16 components) providing:

- `ClaudeMonitor.tsx` -- Main container orchestrating session data fetching and display
- `SessionList.tsx` -- Virtualized list of sessions with search and filtering
- `SessionCard.tsx` -- Individual session display with token counts and status
- `SessionDetailModal.tsx` -- Detailed view of a single session
- `StatsSummary.tsx` -- Aggregated statistics (total tokens, costs, session counts)
- `TokenGauge.tsx` -- Visual gauge for token usage
- `RateLimitBar.tsx` -- Rate limit status visualization
- `ApiUsageSection.tsx` -- Anthropic API usage breakdown
- `SettingsModal.tsx` -- Configuration for API keys and preferences
- `ServerStatus.tsx` -- Server connection status indicator
- `TitleEditModal.tsx` -- Custom session title editor
- `TaskModal.tsx` / `ManualTasksTab.tsx` / `InlineTasks.tsx` -- Task management
- `UsageHistoryTab.tsx` -- Historical usage trends
- `RateLimitSyncModal.tsx` -- Rate limit synchronization

### Shared Components

- `CommandPalette.tsx` -- Cmd+K powered by cmdk for quick project/category navigation
- `ExportButton.tsx` -- Multi-format export (PDF via jsPDF, CSV, JSON)
- `FavoriteButton.tsx` -- Toggle favorites with localStorage persistence
- `DetailPanel.tsx` -- Slide-out panel for project details
- `ThemeProvider.tsx` / `ThemeToggle.tsx` -- Theme management via next-themes

## State Management

| State Type | Storage | Scope |
|-----------|---------|-------|
| Server data | API routes with in-memory cache | Session-scoped (refreshes on page load) |
| UI state | React useState | Component-scoped |
| User preferences | localStorage | Persistent across sessions |
| Session titles | localStorage via `custom-title-storage.ts` | Persistent |
| Favorites | localStorage via `FavoriteButton.tsx` | Persistent |
| Theme | localStorage via next-themes | Persistent |
| Budget settings | localStorage | Persistent |
| State backup | JSON file export/import | Manual backup |

## Key Design Decisions

1. **No database**: All data comes from filesystem (session files) or external APIs. User preferences persist in localStorage. This keeps the app zero-config and portable.

2. **Always-mounted ClaudeMonitor**: The session monitor tab is hidden via CSS rather than unmounted to preserve polling state, scroll position, and avoid re-fetching data on tab switches.

3. **Static fallback data**: `projects.json` provides initial project data that is replaced at runtime by auto-discovered data from `/api/projects-catalog`. This ensures the app works even if filesystem scanning fails.

4. **Multi-level caching**: Aggressive caching at every layer minimizes filesystem reads and external API calls while keeping data reasonably fresh.

5. **PWA support**: The app is installable as a desktop PWA via `@ducanh2912/next-pwa`, with manifest and icons configured in the root layout.
