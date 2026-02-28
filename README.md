# Project Portfolio Dashboard

> Claude Code / Codex session monitoring & API cost analysis dashboard

## Overview

A comprehensive dashboard for tracking AI coding assistant sessions (Claude Code and Codex), analyzing API costs across projects, and managing a portfolio of software projects. Built as a frontend-first Next.js application that reads JSONL session files from the local filesystem and integrates with the Anthropic Admin API, GitHub API, and exchange rate services.

This application provides real-time visibility into your AI-assisted development workflow, enabling you to monitor active sessions, track token usage and costs across multiple Claude models, forecast monthly expenditures, detect cost anomalies, and visualize project relationships through an interactive force-directed graph.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Routes](#api-routes)
- [Components Guide](#components-guide)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Caching Strategy](#caching-strategy)
- [Performance Optimizations](#performance-optimizations)
- [Cost Analysis](#cost-analysis)
- [Innovation Features](#innovation-features)
- [Gamification System](#gamification-system)
- [Security](#security)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Features

### Session Monitoring
- **Real-time session monitoring** for Claude Code and Codex with live status indicators
- **Session grouping** into active (< 5 minutes), recent (< 1 hour), and past categories
- **Custom session titles** with edit/reset functionality persisted to localStorage
- **Inline task display** showing todo progress (pending/in-progress/completed) per session
- **Token usage gauges** with color-coded severity (blue/yellow/red) per session
- **Session detail modal** with comprehensive token breakdown and cost analysis
- **Session state backup/restore** for preserving custom titles and manual tasks across sessions

### Cost Tracking & Analysis
- **Multi-currency cost tracking** with live USD/JPY exchange rates from Open Exchange Rate API
- **Per-model cost breakdown** supporting Claude Opus 4.5, Opus 4.6, Sonnet 4.5, and Haiku 4.5
- **Monthly cost trends** with CSS-based bar charts showing cost progression
- **Cost anomaly detection** using z-score analysis on rolling 7-day windows to flag unusual spending
- **Monthly cost forecast** using linear regression on recent daily costs with confidence levels
- **Project-level cost attribution** mapping sessions to projects via filesystem paths
- **Budget tracking** with configurable monthly budget alerts

### Project Management
- **Auto-discovery project catalog** scanning the local filesystem for project folders
- **Interactive D3.js relationship graph** connecting projects that share 2+ technologies
- **Category-based filtering** with color-coded category badges
- **Technology stack filtering** showing top 15 technologies across all projects
- **Project health scoring** based on activity recency, cost efficiency, and session patterns
- **Favorites system** with persistent star/unstar functionality
- **Project search** across names, descriptions, and technologies

### Developer Experience
- **Command palette** (Cmd/Ctrl+K) for quick navigation to any project or feature
- **Export functionality** supporting PDF, CSV, and JSON formats
- **Dark/Light/System theme** support with smooth transitions via next-themes
- **Responsive design** optimized for desktop, tablet, and mobile viewports
- **PWA support** with service worker for installable desktop experience
- **Keyboard shortcuts** for common actions
- **Rate limit monitoring** via Anthropic Admin API with visual gauge indicators

### Visualization
- **Category distribution** displayed as both bar chart and pie chart using Recharts
- **Technology frequency chart** showing top 15 technologies as horizontal bars
- **Monthly cost bar charts** with USD labels and JPY conversion
- **Daily activity timeline** showing session counts per day
- **Force-directed relationship graph** with zoom, pan, and drag interaction
- **Token usage breakdowns** with input/output/cache metrics

## Tech Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Framework | Next.js | 16.1.4 | React meta-framework with API routes |
| UI Library | React | 19.2.3 | Component-based UI library |
| Language | TypeScript | 5.x | Static type checking (strict mode) |
| Styling | Tailwind CSS | 4.x | Utility-first CSS framework |
| Animation | Framer Motion | 12.x | Production-ready animations |
| Charts | Recharts | 3.7.x | Declarative React chart components |
| Graphs | D3.js | 7.9.x | Force-directed relationship visualization |
| Virtualization | @tanstack/react-virtual | 3.x | Virtual scrolling for large lists |
| Theme | next-themes | 0.4.x | Dark/light/system theme management |
| Command Palette | cmdk | 1.1.x | Accessible command menu component |
| PDF Export | jsPDF + html2canvas | 4.0.x + 1.4.x | Client-side PDF generation |
| PWA | @ducanh2912/next-pwa | 10.x | Progressive Web App support |
| Testing | Node.js test runner + tsx | 20.x + 4.x | Built-in test runner with TypeScript |
| Linting | ESLint | 9.x | Code quality enforcement |
| Formatting | Prettier | - | Consistent code formatting |
| CI/CD | GitHub Actions | - | Automated build, lint, and test |

## Architecture

### System Design

Frontend-only SPA with Next.js API routes for server-side data processing. No database required — all persistent state lives in localStorage and JSONL session files on disk.

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Sessions │  │ Overview │  │  Graph   │  │  Usage   │       │
│  │   Tab    │  │   Tab    │  │   Tab    │  │   Tab    │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│       │              │              │              │             │
│       └──────────────┼──────────────┼──────────────┘             │
│                      │              │                            │
│              ┌───────▼──────┐  ┌───▼────┐                       │
│              │ React Hooks  │  │  D3.js │                       │
│              │ + localStorage│  │ Force  │                       │
│              └───────┬──────┘  └────────┘                       │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │ fetch()
┌──────────────────────▼──────────────────────────────────────────┐
│                    Next.js API Routes                           │
│                                                                 │
│  /api/sessions  /api/usage-stats  /api/project-costs           │
│  /api/config    /api/anthropic/*  /api/projects-catalog         │
│  /api/todos     /api/usage-snapshots  /api/codex-sessions      │
│                                                                 │
│              ┌──────────────────┐                               │
│              │  In-Memory Cache  │                               │
│              │  (TTL 5-60s)     │                               │
│              └────────┬─────────┘                               │
│                       │                                         │
└───────────────────────┼─────────────────────────────────────────┘
                        │ fs.readFile / fetch
        ┌───────────────┼───────────────────────┐
        │               │                       │
  ┌─────▼─────┐  ┌─────▼──────┐  ┌────────────▼─────────┐
  │  JSONL    │  │ Anthropic  │  │  GitHub / Exchange   │
  │ Session   │  │ Admin API  │  │  Rate APIs           │
  │  Files    │  │            │  │                      │
  └───────────┘  └────────────┘  └──────────────────────┘
```

### Data Flow

1. **Session Files → API Routes → Components**: JSONL files in `~/.claude/projects/` are parsed by API routes, which aggregate token usage, calculate costs per model, and return structured JSON to React components.

2. **Anthropic API → Rate Limits / Usage**: The Admin API provides billing data and rate limit information, proxied through API routes to avoid CORS issues and protect the API key.

3. **GitHub API → Repository Stats**: Repository metadata (stars, forks, issues) is fetched via the GitHub API with localStorage caching (5-minute TTL).

4. **localStorage → User Preferences**: Custom session titles, favorites, manual tasks, theme preferences, and budget settings are persisted in localStorage.

5. **Exchange Rate API → Currency Conversion**: Live USD/JPY rates from Open Exchange Rate API with 24-hour caching for cost display in both currencies.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- **Claude Code** installed (for session data at `~/.claude/projects/`)

### Installation

```bash
# Clone the repository
git clone https://github.com/wwwnakanaka1-lgtm/project-portfolio-dashboard.git
cd project-portfolio-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will open automatically at `http://localhost:<dynamic-port>/`.

### Quick Start with start.bat (Windows)

```bash
# Double-click start.bat or run from terminal
start.bat
```

The start script automatically:
1. Kills any stale processes from previous runs
2. Removes stale Next.js lock files
3. Finds an available port starting from 3002
4. Opens the browser after the server is ready

### Environment Variables

Create a `.env.local` file (see `.env.example`):

```env
# Anthropic Admin API key (optional - for usage/rate limit data)
ANTHROPIC_ADMIN_API_KEY=your-admin-api-key

# GitHub token (optional - for repo stats)
GITHUB_TOKEN=your-github-token
```

The Admin API key can also be configured at runtime through the Settings modal in the dashboard UI.

## Project Structure

```
project-portfolio-dashboard/
├── .github/workflows/
│   └── ci.yml                    # GitHub Actions CI pipeline
├── docs/
│   └── ARCHITECTURE.md           # Detailed architecture documentation
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   └── icon-*.png                # App icons (192, 512)
├── src/
│   ├── app/
│   │   ├── api/                  # 12 REST API route handlers
│   │   │   ├── anthropic/        # Anthropic Admin API proxy
│   │   │   │   ├── ratelimit/route.ts
│   │   │   │   └── usage/route.ts
│   │   │   ├── codex-sessions/route.ts
│   │   │   ├── config/route.ts
│   │   │   ├── plan-usage/route.ts
│   │   │   ├── project-costs/route.ts
│   │   │   ├── projects-catalog/route.ts
│   │   │   ├── session-state-backup/route.ts
│   │   │   ├── sessions/route.ts
│   │   │   ├── todos/route.ts
│   │   │   ├── usage-snapshots/route.ts
│   │   │   └── usage-stats/route.ts
│   │   ├── globals.css           # Global styles + glassmorphism design system
│   │   ├── layout.tsx            # Root layout with ThemeProvider
│   │   └── page.tsx              # Main orchestrator (4 tabs)
│   ├── components/
│   │   ├── claude/               # Claude session monitoring
│   │   │   ├── ApiUsageSection.tsx
│   │   │   ├── ClaudeMonitor.tsx # Main session monitor (1344 lines)
│   │   │   ├── InlineTasks.tsx
│   │   │   ├── ManualTasksTab.tsx
│   │   │   ├── RateLimitBar.tsx
│   │   │   ├── RateLimitSyncModal.tsx
│   │   │   ├── ServerStatus.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   ├── SessionDetailModal.tsx
│   │   │   ├── SessionList.tsx
│   │   │   ├── SettingsModal.tsx
│   │   │   ├── StatsSummary.tsx
│   │   │   ├── TaskModal.tsx
│   │   │   ├── TitleEditModal.tsx
│   │   │   └── TokenGauge.tsx
│   │   ├── codex/
│   │   │   └── CodexMonitor.tsx
│   │   ├── ui/
│   │   │   ├── AnimatedCard.tsx
│   │   │   └── LoadingSkeleton.tsx
│   │   ├── ActivityTimeline.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── CodeStats.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── CostAnomalyAlert.tsx
│   │   ├── CostChart.tsx
│   │   ├── DetailPanel.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ExportButton.tsx
│   │   ├── FavoriteButton.tsx
│   │   ├── GitHubStats.tsx
│   │   ├── LaunchButton.tsx
│   │   ├── ProjectTable.tsx
│   │   ├── RelationshipGraph.tsx
│   │   ├── TechChart.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── UsageStats.tsx
│   ├── hooks/
│   │   └── useExchangeRate.ts
│   ├── lib/
│   │   ├── api-cache.ts          # In-memory TTL cache
│   │   ├── codex-session-utils.ts
│   │   ├── cost-anomaly.ts       # Z-score anomaly detection
│   │   ├── cost-forecast.ts      # Linear regression forecasting
│   │   ├── custom-title-storage.ts
│   │   ├── exchange-rate.ts
│   │   ├── export.ts
│   │   ├── export-html.ts
│   │   ├── gamification.ts       # Level/badge system
│   │   ├── github.ts
│   │   ├── project-health.ts     # Health scoring
│   │   ├── projects.json
│   │   ├── rolling-window.ts
│   │   ├── session-state-backup.ts
│   │   ├── types.ts
│   │   ├── usage-snapshot.ts
│   │   └── usage-types.ts
│   ├── stores/
│   │   └── useThemeStore.ts
│   ├── types/
│   │   └── index.ts              # Re-exported type barrel
│   └── middleware.ts              # Security headers + rate limiting
├── .env.example
├── .prettierrc
├── Dockerfile
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── README.md
├── start.bat
├── stop.bat
└── tsconfig.json
```

## API Routes

### Session Management

#### `GET /api/sessions`

Returns all Claude Code sessions with token usage parsed from JSONL files.

**Response:**
```json
{
  "sessions": [
    {
      "id": "abc123",
      "name": "Session Title",
      "messageCount": 42,
      "created": "2026-01-15T10:30:00Z",
      "modified": "2026-01-15T11:45:00Z",
      "projectPath": "/path/to/project",
      "status": "active",
      "minutesAgo": 3.5,
      "tokenUsage": {
        "inputTokens": 150000,
        "outputTokens": 25000,
        "cacheReadTokens": 80000,
        "cacheCreationTokens": 12000,
        "totalTokens": 267000
      },
      "estimatedCost": 1.234
    }
  ],
  "totalCost": 45.67,
  "computedAt": "2026-01-15T12:00:00Z"
}
```

**Session Status Logic:**
- `active`: Modified within the last 5 minutes
- `recent`: Modified within the last 1 hour
- `past`: Modified more than 1 hour ago

#### `GET /api/codex-sessions`

Returns Codex sessions parsed from `~/.codex/` directory.

#### `GET /api/todos?sessionId={id}`

Returns todo items for a specific session.

#### `POST /api/todos`

Creates or updates todo items for a session.

### Cost & Usage

#### `GET /api/usage-stats`

Returns aggregated usage statistics with per-model cost breakdown.

**Response:**
```json
{
  "version": 1,
  "dailyActivity": [
    { "date": "2026-01-15", "messageCount": 120, "sessionCount": 8, "toolCallCount": 45 }
  ],
  "modelUsage": {
    "claude-opus-4-6": {
      "inputTokens": 5000000,
      "outputTokens": 800000,
      "cacheReadInputTokens": 3000000,
      "cacheCreationInputTokens": 500000,
      "costUSD": 12.50
    }
  },
  "totalSessions": 150,
  "totalMessages": 2400
}
```

#### `GET /api/project-costs`

Returns cost breakdown aggregated by project.

**Response:**
```json
{
  "costs": [
    {
      "projectPath": "/path/to/project",
      "projectName": "my-project",
      "totalCost": 8.45,
      "sessionCount": 12,
      "totalTokens": 3500000,
      "lastUsed": "2026-01-15T10:00:00Z"
    }
  ],
  "totalCost": 45.67
}
```

#### `GET /api/plan-usage`

Returns plan-level usage data.

#### `GET /api/usage-snapshots`

Returns historical usage snapshots for trend analysis.

#### `POST /api/usage-snapshots`

Saves a new usage snapshot.

### Configuration

#### `GET /api/config`

Returns current configuration (API keys, settings).

#### `POST /api/config`

Updates configuration.

#### `DELETE /api/config`

Removes stored API key.

### External Integrations

#### `GET /api/anthropic/usage`

Proxies the Anthropic Admin API to retrieve billing and usage data. Requires `ANTHROPIC_ADMIN_API_KEY`.

#### `GET /api/anthropic/ratelimit`

Proxies the Anthropic Admin API to retrieve rate limit status.

#### `GET /api/projects-catalog`

Auto-discovers projects from the local filesystem. Scans directories matching known project patterns and returns structured project metadata including:
- Project name, description, and category
- Technology stack detection (from package.json, requirements.txt, etc.)
- Status (active, archive, empty)
- Launch commands

### State Management

#### `GET /api/session-state-backup`

Returns the current session state backup including custom titles, manual tasks, theme preferences, and display settings.

#### `POST /api/session-state-backup`

Creates or restores a session state backup.

## Components Guide

### Page-Level Components

| Component | Location | Description |
|-----------|----------|-------------|
| `Home` | `page.tsx` | Main orchestrator with 4-tab layout, tab indicator animation, filter management |
| `ClaudeMonitor` | `claude/ClaudeMonitor.tsx` | Session monitoring hub (1344 lines), manages polling, titles, tasks, and state backup |
| `UsageStats` | `UsageStats.tsx` | Cost analytics with monthly charts, model breakdown, and anomaly alerts |
| `RelationshipGraph` | `RelationshipGraph.tsx` | D3 force-directed graph with zoom/pan/drag |

### Session Components

| Component | Description |
|-----------|-------------|
| `SessionCard` | Individual session card with token gauge, cost display, and todo progress |
| `SessionList` | Groups sessions into active/recent/past sections with collapsible past |
| `SessionDetailModal` | Full session detail with token breakdown, cost, and cache metrics |
| `StatsSummary` | Summary cards with session count, cost total, and forecast trend badge |
| `TokenGauge` | Visual gauge showing token usage relative to context window |
| `RateLimitBar` | Rate limit visualization with current/max display |
| `InlineTasks` | Compact task list showing up to 5 items per session |

### Data Visualization Components

| Component | Description |
|-----------|-------------|
| `CategoryChart` | Bar + Pie chart showing project distribution across categories |
| `TechChart` | Horizontal bar chart of top 15 technologies with color coding |
| `CostChart` | Cost breakdown visualization |
| `CostAnomalyAlert` | Alert panel showing detected cost anomalies with severity badges |
| `ActivityTimeline` | Daily activity heatmap/timeline |

### UI Components

| Component | Description |
|-----------|-------------|
| `CommandPalette` | cmdk-powered Cmd/Ctrl+K command menu |
| `ErrorBoundary` | React error boundary with retry button |
| `LoadingSkeleton` | Shimmer loading skeletons (4 types: monitor, graph, stats, table) |
| `AnimatedCard` | Framer Motion wrapper with fade-in + slide-up animation |
| `ThemeToggle` | Three-state theme switcher (light/dark/system) |
| `ExportButton` | Dropdown for PDF/CSV/JSON export |
| `FavoriteButton` | Star toggle with localStorage persistence |

## Data Flow

### Session Data Pipeline

```
~/.claude/projects/*/sessions/*.jsonl
         │
         ▼
    API: /api/sessions
    - Scans JSONL files
    - Parses message entries
    - Calculates token usage per model
    - Estimates cost using MODEL_PRICING
    - Returns grouped session list
         │
         ▼
    ClaudeMonitor (React)
    - Polls every 5 seconds
    - Groups into active/recent/past
    - Applies custom titles
    - Renders SessionList → SessionCard
```

### Cost Calculation Pipeline

```
Token counts per model
         │
         ▼
    MODEL_PRICING (usage-types.ts)
    - Opus 4.5/4.6: $15/$75 per 1M tokens (in/out)
    - Sonnet 4.5: $3/$15 per 1M tokens
    - Haiku 4.5: $0.80/$4 per 1M tokens
    - Cache read/create with separate rates
         │
         ▼
    getPricing(model) → calculateCost(tokens, model)
         │
         ▼
    Exchange rate conversion (USD → JPY)
    - Live rate from Open Exchange Rate API
    - 24-hour cache
    - Fallback to ¥150 if API unavailable
```

## State Management

### Server State
API routes with in-memory caching (api-cache.ts). TTL ranges from 5 seconds (sessions) to 60 seconds (usage stats).

### Client State
React useState + custom hooks. No global state management library (no Redux/Zustand) — component-local state with prop drilling for simple data flow.

### Persistence Layer

| Data | Storage | TTL |
|------|---------|-----|
| Custom session titles | localStorage (`claude:*`, `codex:*`) | Permanent |
| Favorite projects | localStorage (`favorites`) | Permanent |
| Manual tasks | localStorage + API | Permanent |
| Theme preference | localStorage (`theme`) | Permanent |
| Budget settings | localStorage (`budget`) | Permanent |
| GitHub stats | localStorage (`gh-stats-*`) | 5 minutes |
| Display settings | localStorage (`display-settings`) | Permanent |
| Session state backup | JSON export/import file | Manual |

## Caching Strategy

| Layer | TTL | Purpose | Implementation |
|-------|-----|---------|---------------|
| In-memory (api-cache.ts) | 5-60s | API route response caching | Map with timestamp-based expiry |
| File mtime cache | Per-file | Skip re-parsing unchanged JSONL | fs.stat mtime comparison |
| localStorage (GitHub) | 5 min | GitHub API response caching | JSON string with timestamp |
| localStorage (preferences) | Permanent | User settings persistence | Direct key-value storage |
| Exchange rate | 24h | USD/JPY conversion rate | Server-side cache with TTL |
| PWA Service Worker | Varies | Static asset caching | Workbox runtime caching |

## Performance Optimizations

### Code Splitting
- **Dynamic imports**: ClaudeMonitor, RelationshipGraph, and UsageStats are loaded via `next/dynamic` with loading skeletons, reducing initial bundle size
- **D3 submodule imports**: Only `d3-selection`, `d3-force`, `d3-zoom`, and `d3-drag` are imported instead of the full D3 library (~500KB → ~50KB)
- **Optimized package imports**: `optimizePackageImports` in next.config.ts for recharts, d3, framer-motion, and lucide-react

### Rendering
- **React.memo**: Applied to CategoryChart, TechChart, ProjectTable, SessionCard, SessionList, and StatsSummary
- **useMemo**: Expensive computations (category data, tech data, filtered projects) are memoized
- **ErrorBoundary**: Each tab is wrapped in an independent error boundary to prevent cross-tab failures

### Network
- **AbortController**: API requests are cancellable when components unmount
- **In-memory TTL cache**: Prevents redundant filesystem reads within 5-60 second windows
- **File mtime checks**: JSONL files are only re-parsed when their modification time changes

### Animation
- **Framer Motion AnimatePresence**: Tab transitions use `mode="popLayout"` for instant switching (no exit animation delay)
- **CSS transitions**: Tab indicator uses pure CSS transitions (faster than JS animation)
- **Glassmorphism**: Hardware-accelerated `backdrop-filter: blur()` for glass effects

## Cost Analysis

### Supported Models

| Model | Input | Output | Cache Read | Cache Create |
|-------|-------|--------|-----------|-------------|
| Claude Opus 4.5 | $15/1M | $75/1M | $1.50/1M | $18.75/1M |
| Claude Opus 4.6 | $15/1M | $75/1M | $1.50/1M | $18.75/1M |
| Claude Sonnet 4.5 | $3/1M | $15/1M | $0.30/1M | $3.75/1M |
| Claude Haiku 4.5 | $0.80/1M | $4/1M | $0.08/1M | $1.00/1M |

### Anomaly Detection

The cost anomaly detection system uses z-score analysis on a rolling 7-day window:

1. For each day (starting from day 8+), calculate the mean and standard deviation of the previous 7 days' costs
2. Compute z-score: `(actual_cost - mean) / stddev`
3. Classify: z-score > 2 → **warning**, z-score > 3 → **critical**
4. Results sorted by date descending (most recent first)

### Monthly Forecast

Linear regression on the past 14 days of daily costs:

1. Fit a line `y = mx + b` to recent cost data
2. Project remaining days using the slope
3. Confidence: **high** (10+ days, R² > 0.7), **medium** (5-9 days, R² 0.3-0.7), **low** (< 5 days, R² < 0.3)
4. Trend: **increasing** (slope > 5% of average), **decreasing** (slope < -5%), **stable** (within ±5%)

## Innovation Features

### Cost Anomaly Detection (`cost-anomaly.ts`)
Z-score-based detection on rolling 7-day windows. Requires 8+ days of data. Warning at z > 2, critical at z > 3.

### Cost Forecasting (`cost-forecast.ts`)
Linear regression for month-end cost projection. Includes R-squared confidence scoring and trend classification.

### Project Health Scoring (`project-health.ts`)
Weighted health score (0-100) with letter grades A-F:
- Activity Recency (40%): 100 if active today, linear decay to 0 over 30 days
- Cost Efficiency (30%): Exponential decay on cost-per-message
- Session Health (30%): Optimal 5-60 min, penalizes <1 min and >120 min

### Middleware Security (`middleware.ts`)
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
- API rate limiting: 120 requests per minute per IP with X-RateLimit headers

### Glassmorphism Design System (`globals.css`)
- CSS custom properties for glass backgrounds, borders, shadows, and blur
- `.glass-card` utility class with hover effects
- Shimmer loading animation
- Count-up number entrance animation
- Smooth tab indicator transition

## Gamification System

The gamification module (`src/lib/gamification.ts`) provides a level and badge system:

### Levels
Progressive XP-based leveling with 10 tiers:
1. Newbie Developer → 10. Grandmaster

XP sources:
- Projects: 50 XP each
- Sessions: 5 XP each
- Messages: 1 XP each
- Active days: 20 XP each

### Badges
Achievement badges earned through portfolio milestones:
- **First Steps**: Create your first project
- **Prolific Builder**: Create 10+ projects
- **Polyglot**: Use 10+ different technologies
- **Marathon Coder**: Complete 100+ sessions
- **Big Spender**: Spend over $100 on AI assistance
- **Diversified**: Projects across 5+ categories

## Security

### Middleware Protection
- **Security headers** applied to all routes via Next.js middleware
- **Rate limiting** on API routes (120 req/min per IP)
- **CORS**: Default Next.js CORS (same-origin)

### API Key Management
- Admin API key stored server-side (not exposed to client)
- Runtime configuration via Settings modal (stored in server-side file)
- No secrets in localStorage or client-side code

### Data Privacy
- All data stays local (no external data uploads)
- Session files are read-only (never modified by the dashboard)
- Exchange rate API is the only external data fetch (public, no auth)

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ANTHROPIC_ADMIN_API_KEY` | Anthropic Admin API key for usage/rate limit data | - | No |
| `GITHUB_TOKEN` | GitHub personal access token for repo stats | - | No |
| `PORT` | Development server port | 3000 | No |

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["recharts", "d3", "framer-motion", "lucide-react"],
  },
};
```

### TypeScript Configuration
Strict mode is enabled in `tsconfig.json` with all recommended checks.

## Troubleshooting

### Common Issues

#### Dashboard shows no sessions
- Verify Claude Code has been used (check `~/.claude/projects/` for JSONL files)
- Ensure the development server has read access to the home directory
- Check browser console for API errors

#### Rate limit data not showing
- Set `ANTHROPIC_ADMIN_API_KEY` in environment or via Settings modal
- Verify the key has Admin API permissions (not regular API key)
- Check `/api/anthropic/ratelimit` response for errors

#### Cost data shows $0 for all sessions
- JSONL files may not contain model-specific token data
- Verify session files have `type: "assistant"` messages with `usage` fields
- Check that `MODEL_PRICING` in `usage-types.ts` covers the model ID

#### Exchange rate shows ¥150 (fallback)
- The Open Exchange Rate API may be temporarily unavailable
- Check network connectivity
- The fallback rate (¥150) is used when the API fails

#### Graph tab loads slowly
- D3 imports are optimized to submodules; if still slow, check network tab for large chunks
- The force simulation runs on the main thread; consider reducing project count via filters

#### start.bat port conflict
- The script automatically finds the next available port starting from 3002
- If issues persist, run `stop.bat` first to clean up stale processes
- Check `netstat -ano | findstr LISTENING` for port conflicts

### Performance Issues

#### Slow tab transitions
- Framer Motion AnimatePresence uses `mode="popLayout"` with 100ms fade
- If still slow, check browser DevTools Performance tab for long tasks
- Dynamic imports may cause initial delay on first tab switch

#### High memory usage
- Large numbers of sessions (1000+) may cause high memory usage
- Consider collapsing the "past sessions" section
- Virtual scrolling is available for past session lists

## Development Guide

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint checks |
| `npm run test` | Run test suite (Node.js test runner + tsx) |
| `npm run collect-stats` | Collect project statistics via CLI script |

### Adding a New API Route

1. Create `src/app/api/{route-name}/route.ts`
2. Export `GET`, `POST`, `PUT`, or `DELETE` handlers
3. Use `api-cache.ts` for caching if the route reads files
4. Add JSDoc to the route handler

### Adding a New Component

1. Create the component in the appropriate directory:
   - `components/claude/` for session-related components
   - `components/ui/` for reusable UI primitives
   - `components/` for feature components
2. Apply `React.memo()` if the component is pure (no internal state that changes independently)
3. Use `useMemo()` for expensive computations
4. Add TypeScript interfaces for props

### Code Style

- **Formatting**: Prettier with double quotes, semicolons, trailing commas
- **Linting**: ESLint with Next.js recommended config + TypeScript rules
- **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files
- **Imports**: Prefer `@/` alias for src imports
- **Types**: Strict TypeScript — no `any` unless absolutely necessary

## Testing

### Test Framework

Uses Node.js built-in test runner with `tsx` for TypeScript support:

```bash
npm test
```

### Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| `cost-anomaly.ts` | 7 tests | Edge cases, spike detection, sorting |
| `cost-forecast.ts` | 7 tests | Empty data, trends, confidence levels |
| `project-health.ts` | 10 tests | Grades, factors, boundary conditions |
| `usage-types.ts` | 13 tests | Pricing, cost calculation, fallbacks |
| `session-state-backup.ts` | 5 tests | Parse, merge, fingerprint, migration |
| `rolling-window.ts` | 5 tests | Window calculation, reset behavior |
| `custom-title-storage.ts` | 6 tests | Normalize, parse, hydrate, backup |
| `codex-session-utils.ts` | 6 tests | File discovery, plan parsing |

**Total: 59 tests, all passing.**

### Running Specific Tests

```bash
# Run all tests
npm test

# Run a specific test file
npx tsx --test src/lib/cost-anomaly.test.ts
```

## Deployment

### Docker

```bash
# Build the Docker image
docker build -t portfolio-dashboard .

# Run the container
docker run -p 3000:3000 portfolio-dashboard
```

### Vercel

The project is compatible with Vercel deployment. Note that filesystem-dependent API routes (`/api/sessions`, `/api/usage-stats`, etc.) require access to local JSONL files and will not work in serverless environments without modifications.

### Windows (start.bat)

```bash
# Start the dashboard
start.bat

# Stop all processes
stop.bat
```

The start script uses dynamic port discovery and automatically opens the browser when the server is ready.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes with tests
4. Run `npm run lint && npm test && npm run build`
5. Commit with descriptive message
6. Push and create a Pull Request

### Commit Convention

- `Claude:` prefix for AI-assisted commits
- `Codex:` prefix for Codex-assisted commits
- Concise description of the "why" in the first line
- Detailed changes in the body if needed

---

Built with Next.js 16, React 19, TypeScript 5, and Tailwind CSS 4.
