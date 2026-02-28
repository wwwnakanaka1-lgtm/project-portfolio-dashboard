# Project Portfolio Dashboard

> Claude Code / Codex session monitoring & API cost analysis dashboard

## Overview

A comprehensive dashboard for tracking AI coding assistant sessions (Claude Code and Codex), analyzing API costs across projects, and managing a portfolio of software projects. Built as a frontend-first Next.js application that reads JSONL session files from the local filesystem and integrates with the Anthropic Admin API, GitHub API, and exchange rate services.

## Features

- Real-time session monitoring for Claude Code and Codex
- Multi-currency cost tracking (USD/JPY with live exchange rates)
- Rate limit monitoring via Anthropic Admin API
- Project catalog with auto-discovery from the local filesystem
- Interactive D3.js force-directed relationship graph
- Command palette (Cmd+K) for quick navigation
- Export to PDF/CSV/JSON
- Dark/Light/System theme support with next-themes
- Session state backup and restore
- Cost anomaly detection and monthly forecast
- Project health scoring with activity metrics
- GitHub integration (stars, forks, issues, PRs)
- PWA support for installable desktop experience
- Virtual scrolling for large session lists

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 + React 19 |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Charts | Recharts + D3.js |
| Virtualization | @tanstack/react-virtual |
| Theme | next-themes |
| Export | jsPDF + html2canvas |
| PWA | @ducanh2912/next-pwa |

## Architecture

Frontend-only SPA with Next.js API routes for server-side data processing. No database required -- all persistent state lives in localStorage and JSONL session files on disk.

- **Data sources**: JSONL session files, Anthropic Admin API, GitHub API, Exchange Rate API
- **State management**: React hooks + localStorage for persistence
- **Caching**: Multi-level (in-memory TTL, file mtime checks, localStorage)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Getting Started

```bash
cd C:\Users\wwwhi\Create\project-portfolio-dashboard
npm install
npm run dev    # Development server on http://localhost:3000
npm run build  # Production build
npm run start  # Start production server
npm run lint   # Run ESLint
npm run test   # Run tests
```

## Project Structure

```
src/
├── app/
│   ├── api/                  # REST API routes
│   │   ├── anthropic/        # Anthropic Admin API proxy (usage, ratelimit)
│   │   ├── codex-sessions/   # Codex session data
│   │   ├── config/           # API key management
│   │   ├── plan-usage/       # Plan usage data
│   │   ├── project-costs/    # Cost breakdown by project
│   │   ├── projects-catalog/ # Auto-discovered project catalog
│   │   ├── session-state-backup/ # State backup management
│   │   ├── sessions/         # Session list with token usage
│   │   ├── todos/            # Manual task management
│   │   ├── usage-snapshots/  # Usage data snapshots
│   │   └── usage-stats/      # Aggregated usage & cost stats
│   ├── layout.tsx            # Root layout with ThemeProvider
│   ├── page.tsx              # Main orchestrator (4 tabs)
│   └── globals.css           # Global styles
├── components/
│   ├── claude/               # Claude session monitoring (16 components)
│   ├── codex/                # Codex session monitoring
│   ├── ActivityTimeline.tsx   # Project activity timeline
│   ├── CategoryChart.tsx      # Category distribution chart
│   ├── CodeStats.tsx          # Code statistics display
│   ├── CommandPalette.tsx     # Cmd+K command palette (cmdk)
│   ├── CostChart.tsx          # Cost visualization chart
│   ├── DetailPanel.tsx        # Project detail slide-out panel
│   ├── ExportButton.tsx       # PDF/CSV/JSON export
│   ├── FavoriteButton.tsx     # Project favorites with persistence
│   ├── GitHubStats.tsx        # GitHub repository stats
│   ├── LaunchButton.tsx       # Project launch action
│   ├── ProjectTable.tsx       # Sortable/searchable project table
│   ├── RelationshipGraph.tsx  # D3 force-directed project graph
│   ├── TechChart.tsx          # Technology distribution chart
│   ├── ThemeProvider.tsx      # Theme context provider
│   ├── ThemeToggle.tsx        # Dark/light/system toggle
│   └── UsageStats.tsx         # Cost analytics with charts
├── hooks/                     # (Custom React hooks via component files)
└── lib/
    ├── api-cache.ts           # In-memory TTL cache for API routes
    ├── codex-session-utils.ts # Codex session file parsing
    ├── cost-anomaly.ts        # Cost anomaly detection logic
    ├── custom-title-storage.ts# Custom session title persistence
    ├── exchange-rate.ts       # USD/JPY exchange rate fetcher
    ├── export.ts              # CSV/JSON export utilities
    ├── export-html.ts         # HTML/PDF export utilities
    ├── github.ts              # GitHub API client
    ├── projects.json          # Static project data (fallback)
    ├── rolling-window.ts      # Rolling window statistics
    ├── session-state-backup.ts# Session state backup/restore
    ├── types.ts               # TypeScript type definitions
    ├── usage-snapshot.ts      # Usage snapshot utilities
    └── usage-types.ts         # Usage-related type definitions
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/sessions` | GET | Session list with token usage parsed from JSONL files |
| `/api/usage-stats` | GET | Aggregated usage and cost statistics |
| `/api/project-costs` | GET | Cost breakdown by project |
| `/api/config` | GET/POST/DELETE | API key management (Anthropic Admin key) |
| `/api/anthropic/usage` | GET | Anthropic billing and usage data |
| `/api/anthropic/ratelimit` | GET | Rate limit status from Anthropic API |
| `/api/projects-catalog` | GET | Auto-discovered project catalog from filesystem |
| `/api/codex-sessions` | GET | Codex session data |
| `/api/plan-usage` | GET | Plan usage data |
| `/api/usage-snapshots` | GET/POST | Usage data snapshots for historical tracking |
| `/api/session-state-backup` | GET/POST | Session state backup and restore |
| `/api/todos` | GET/POST | Manual task management |

## Performance Optimizations

- ClaudeMonitor is always mounted and hidden via CSS to preserve session state across tab switches
- React.memo on expensive pure components
- Multi-level caching: in-memory TTL (5-60s) + localStorage + file mtime checks
- Virtual scrolling via @tanstack/react-virtual for large session lists
- Optimized package imports (recharts, d3, framer-motion)
- AbortController for cancellable API requests

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `ANTHROPIC_ADMIN_API_KEY` | Anthropic Admin API key for usage and rate limit data | Optional |

The Admin API key can also be configured at runtime through the Settings modal in the dashboard UI, which stores it via the `/api/config` route.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run test` | Run test suite |
| `npm run collect-stats` | Collect project statistics via script |
