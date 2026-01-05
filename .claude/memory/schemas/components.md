# React Component Schema

**Last Updated:** 2026-01-04
**Framework:** React 18 + Vite
**Location:** `web/src/`

## Directory Structure

```
web/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.jsx
│   │   │   └── Layout.jsx
│   │   ├── home/
│   │   │   ├── GreetingHeader.jsx
│   │   │   ├── OverdueAlert.jsx
│   │   │   ├── SearchBar.jsx
│   │   │   ├── QuickActions.jsx
│   │   │   └── SourceCard.jsx
│   │   ├── study/
│   │   │   ├── SessionHeader.jsx
│   │   │   ├── QuestionCard.jsx
│   │   │   ├── AnswerInput.jsx
│   │   │   ├── SelfAssessment.jsx
│   │   │   └── SessionSummary.jsx
│   │   ├── calendar/
│   │   │   ├── CalendarGrid.jsx
│   │   │   ├── MonthNavigation.jsx
│   │   │   └── ScheduleForm.jsx
│   │   ├── review/
│   │   │   ├── ReviewSection.jsx
│   │   │   └── SourceItem.jsx
│   │   ├── progress/
│   │   │   ├── StatCards.jsx
│   │   │   ├── MasteryBySource.jsx
│   │   │   └── WeeklyChart.jsx
│   │   ├── analytics/
│   │   │   ├── InsightCards.jsx
│   │   │   ├── TechniqueComparison.jsx
│   │   │   ├── PerformanceByType.jsx
│   │   │   ├── CalibrationAnalysis.jsx
│   │   │   └── ItemsNeedingAttention.jsx
│   │   ├── sources/
│   │   │   ├── SourcesHeader.jsx
│   │   │   ├── SourcesToolbar.jsx
│   │   │   ├── SourcesList.jsx
│   │   │   ├── UploadZone.jsx
│   │   │   ├── UploadProgress.jsx
│   │   │   ├── ProcessingStatus.jsx
│   │   │   ├── SourceDetailPanel.jsx
│   │   │   └── EmptyState.jsx
│   │   └── shared/
│   │       └── ConfirmationDialog.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Calendar.jsx
│   │   ├── DueForReview.jsx
│   │   ├── Sources.jsx
│   │   ├── Progress.jsx
│   │   ├── Analytics.jsx
│   │   └── Study.jsx
│   ├── contexts/
│   │   └── SupabaseContext.jsx
│   ├── hooks/
│   │   ├── useSources.js
│   │   ├── useSourceUpload.js
│   │   └── useSourceProcessing.js
│   ├── services/
│   │   └── sourcesApi.js
│   ├── lib/
│   │   └── supabase.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Component Categories

### Layout Components

| Component | Purpose |
|-----------|---------|
| Layout | Main wrapper with sidebar and content area |
| Sidebar | Navigation links, user profile, due counts |

### Home Components

| Component | Purpose |
|-----------|---------|
| GreetingHeader | Time-based greeting ("Good morning/afternoon/evening") |
| OverdueAlert | Warning banner when overdue items exist |
| SearchBar | Knowledge base search (placeholder) |
| QuickActions | Study, Plan, Add Document, Analytics buttons |
| SourceCard | Document card with mastery bar, due counts |

### Study Components

| Component | Purpose |
|-----------|---------|
| SessionHeader | Progress indicator, "End session" button |
| QuestionCard | KC type badge, practice mode, prompt |
| AnswerInput | Textarea, submit button, skip link |
| SelfAssessment | 5-point score and difficulty ratings |
| SessionSummary | Modal with session stats, navigation |

### Sources Components (M16-M20)

| Component | Purpose |
|-----------|---------|
| SourcesHeader | Page title, document count |
| SourcesToolbar | Search, filters, sort, Add Document |
| SourcesList | Responsive grid of SourceCards |
| UploadZone | Drag-drop area with status states |
| UploadProgress | 4-step progress indicator |
| ProcessingStatus | Progress bar, step labels |
| SourceDetailPanel | Slide-in drawer with full details |
| EmptyState | CTA when no sources or no filter results |
| ConfirmationDialog | Danger/warning confirmation modals |

### Analytics Components

| Component | Purpose |
|-----------|---------|
| InsightCards | What's Working, Needs Attention, Optimization |
| TechniqueComparison | Retention by technique bundle chart |
| PerformanceByType | Factual/conceptual/procedural bars |
| CalibrationAnalysis | Confidence vs actual score scatter |
| ItemsNeedingAttention | Struggling items with Practice links |

## Custom Hooks

| Hook | Purpose |
|------|---------|
| useSources | Data fetching, filtering, sorting, caching |
| useSourceUpload | File validation, upload state, optimistic updates |
| useSourceProcessing | Realtime subscription + polling for status |

## Context Providers

### SupabaseContext

Location: `contexts/SupabaseContext.jsx`

Provides:
- `supabase` - Supabase client instance
- `getSources()` - Fetch content_sources
- `getKCs(sourceId)` - Fetch knowledge_components
- `getDueCounts()` - Get overdue/due/new counts
- `createSession()` - Start study session
- `recordAttempt()` - Save practice attempt
- Upload queue state management

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| bg-main | #1a1b23 | Primary background |
| bg-card | #23242d | Card backgrounds |
| accent-progress | #22d3ee (cyan) | Progress bars, highlights |
| text-primary | white | Main text |
| text-secondary | gray-400 | Labels, metadata |
| danger | red-500 | Errors, delete actions |
| warning | amber-500 | Overdue indicators |

## Detailed Visual Specifications

Based on reference screenshots.

### Color Palette (Light Theme)

| Token | Value | Usage |
|-------|-------|-------|
| Background (main) | #FAF9F7 | warm off-white |
| Background (sidebar) | #F5F4F2 | slightly darker |
| Card background | #FFFFFF | white |
| Card border | #E5E4E2 | light gray |
| Text (primary) | #1A1A1A | near black |
| Text (secondary) | #6B7280 | gray |
| Text (muted) | #9CA3AF | light gray |
| Accent (progress) | #10B981 | emerald green |
| Accent (alert) | #F59E0B | amber |
| Accent (overdue) | #EF4444 | red |
| Accent (new) | #3B82F6 | blue |
| Button (primary) | #1A1A1A | dark |
| Button (secondary) | #F3F4F6 | light gray |
| Button (action) | #FEF3C7 | light amber background |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Logo | 20px | 600 |
| Page titles | 32px | 600 |
| Section headers | 18px | 600 |
| Card titles | 16px | 500 |
| Body text | 14px | 400 |
| Small/muted | 12px | 400 |

Font family: Inter, system-ui, sans-serif

### Spacing

| Element | Value |
|---------|-------|
| Sidebar width | 240px |
| Content padding | 32px |
| Card padding | 20px |
| Card gap | 16px |
| Section gap | 24px |
| Border radius (cards) | 12px |
| Border radius (buttons) | 8px |

### Component Specs

**Sidebar Navigation Item:** Height 40px, Padding 12px 16px, Border radius 8px, Active state #F3F4F6, Icon 20px, Badge circular amber/white

**Source Card:** Flexible width, Padding 20px, Emoji 32px, Progress bar 8px height, 4px radius

**Alert Banner:** Background #FEF3C7, Border radius 12px, Icon clock amber, Button amber/white

**Study Session Question Card:** Background #F9FAFB, Border radius 12px, Padding 24px

**Knowledge Type Badge:** Background #E0E7FF, Text #4338CA, Padding 4px 12px, Border radius 16px, Font 12px

## Cross-References

- Related API: `schemas/api.md` (frontend calls these endpoints)
- Related milestones: `milestones/webui_core.md`, `milestones/sources_feature.md`
