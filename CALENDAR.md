# Calendar Feature Implementation Plan

**Target Release:** M47-M49
**Status:** Research Complete, Ready for Implementation
**Last Updated:** 2026-01-07

---

## Executive Summary

The calendar feature requires a comprehensive overhaul to integrate with the SM-2 spaced repetition system and add Google Calendar sync. This plan consolidates research from 6 parallel worktrees into a cohesive implementation roadmap.

**Current Problems:**
1. Calendar shows scheduled sessions but not SM-2 due items
2. BUG: Field mismatch (`scheduled_for` vs `started_at`) breaks calendar display
3. No session lifecycle tracking (scheduled → active → completed)
4. Calendar disconnected from Study page
5. No Google Calendar integration

**Solution Architecture:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                        UNIFIED CALENDAR SYSTEM                       │
├─────────────────────────────────────────────────────────────────────┤
│  Calendar Grid                                                       │
│  ├─ Shows scheduled sessions (from sessions table)                  │
│  ├─ Shows SM-2 due counts (from kc_state.next_review_at)           │
│  ├─ Color-coded urgency indicators                                  │
│  └─ Synced to Google Calendar (optional)                           │
├─────────────────────────────────────────────────────────────────────┤
│  Session Lifecycle: scheduled → in_progress → completed             │
│  ├─ Schedule from Calendar → Store in database                      │
│  ├─ Start from Home/Calendar → Navigate to Study                    │
│  ├─ Practice items pre-selected or dynamic                          │
│  └─ End → Update metrics, sync to Google                           │
├─────────────────────────────────────────────────────────────────────┤
│  API Layer: FastAPI endpoints for session CRUD                      │
│  ├─ POST /api/sessions (create scheduled session)                   │
│  ├─ POST /api/sessions/{id}/start (begin session)                   │
│  ├─ POST /api/sessions/{id}/end (complete with metrics)            │
│  └─ GET /api/study/due-counts-by-date (SM-2 integration)           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Worktree 1: UI and UX

### Visual Design: Calendar Grid

**Date Cell States:**

| State | Background | Text | Indicator |
|-------|------------|------|-----------|
| Empty day | transparent | gray-400 | none |
| Today (no items) | emerald (#10B981) | white | ring-2 ring-white |
| Selected (no items) | gray-100 | text-primary | border gray-300 |
| Day with sessions | transparent | text-primary | solid dots (●) by type |
| Day with due items | transparent | text-primary | ring dots (◯) by status |
| Mixed (sessions + due) | transparent | text-primary | dots + rings + badge |

**Indicator Colors:**
- Scheduled sessions: `bg-{type}` (review=amber, study=green, new=blue)
- Due items (rings): overdue=red, due_today=amber, new=blue
- Overflow badge: `bg-gray-400 text-white text-xs px-1 rounded-full`

**Session Detail Panel (below grid):**
```
┌─────────────────────────────────────┐
│ Sessions on Wed, Jan 7              │
├─────────────────────────────────────┤
│  SCHEDULED SESSIONS (2)             │
│  ┌───────────────────────────────┐  │
│  │ ▪ Review Session              │  │
│  │   30 min • Pending            │  │
│  │ [Start] [Edit] [Delete]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  DUE FOR REVIEW (5)                 │
│  ┌───────────────────────────────┐  │
│  │ 🔴 AI/ML Fundamentals         │  │
│  │   3 items overdue             │  │
│  │ [Study Overdue] [Study All]   │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Responsive Breakpoints:**
- Mobile (<640px): Full-width grid, smaller gaps (gap-0.5), bottom sheet for details
- Tablet (640-1024px): Grid + bottom schedule form
- Desktop (>1024px): Grid (2/3) + sidebar form (1/3)

**Accessibility:**
- `role="grid"` with `role="gridcell"` for calendar cells
- Arrow key navigation between dates
- ARIA labels: `aria-label="24, Wednesday. 2 sessions, 3 items due"`
- Focus rings: `focus:ring-2 focus:ring-accent-progress focus:ring-offset-2`
- Color-independent indicators (icons + colors)

---

## Worktree 2: Data Model and Storage

### Bug Fix: Field Mismatch

**Problem:** CalendarGrid reads `scheduled_for`, Calendar inserts `started_at`

**Solution:** Add `scheduled_for` column, preserve `started_at` for actual session start

### Schema Changes

```sql
-- M47: Calendar Data Model Improvements
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS selected_kc_ids TEXT[];
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Status constraint
ALTER TABLE sessions ADD CONSTRAINT check_session_status
  CHECK (status IN ('scheduled', 'in_progress', 'completed'));

-- Timing constraints
ALTER TABLE sessions ADD CONSTRAINT check_session_timing
  CHECK (started_at IS NULL OR started_at >= scheduled_for);

-- Indexes for calendar queries
CREATE INDEX idx_sessions_scheduled_for_status ON sessions(scheduled_for, status);
CREATE INDEX idx_sessions_scheduled_for_date_range ON sessions(DATE(scheduled_for));
CREATE INDEX idx_sessions_upcoming ON sessions(status, scheduled_for)
  WHERE status IN ('scheduled', 'in_progress');
```

### Session Status Workflow

```
scheduled   → in_progress  → completed
   ↑            ↑              ↓
   └────────────┴──────────────┘ (no backward transitions)
```

| Status | Definition | Constraints |
|--------|-----------|-------------|
| `scheduled` | Future session | `started_at IS NULL` |
| `in_progress` | Started, not ended | `started_at NOT NULL`, `ended_at IS NULL` |
| `completed` | Ended | `started_at NOT NULL`, `ended_at NOT NULL` |

### Migration Strategy

```sql
-- Populate scheduled_for from existing started_at
UPDATE sessions SET
  scheduled_for = started_at,
  status = CASE
    WHEN ended_at IS NOT NULL THEN 'completed'
    WHEN started_at <= NOW() AND ended_at IS NULL THEN 'in_progress'
    ELSE 'scheduled'
  END;
```

---

## Worktree 3: Scheduling and Practice Integration

### SM-2 Integration API

**New Endpoint:** `GET /api/study/due-counts-by-date`

```
GET /api/study/due-counts-by-date?start_date=2026-01-15&end_date=2026-02-15
```

**Response:**
```json
{
  "date_range": { "start_date": "2026-01-15", "end_date": "2026-02-15" },
  "summary": { "total_items_in_range": 145, "peak_date": "2026-01-22", "peak_count": 12 },
  "by_date": [
    {
      "date": "2026-01-22",
      "overdue": 0,
      "due_today": 8,
      "new_content": 4,
      "total": 12,
      "urgency": "critical",
      "scheduled_sessions": []
    }
  ]
}
```

### Urgency Calculation

```python
def calculate_urgency(overdue, due_today, new_content, total):
    if overdue > 0: return "critical"
    elif due_today > 0: return "high" if total >= 5 else "medium"
    elif new_content > 0: return "low"
    else: return "none"
```

### Smart Scheduling Recommendations

```python
def get_scheduling_recommendations(months_ahead=3, session_duration_minutes=30):
    """Suggest optimal session dates based on SM-2 distribution."""
    counts = get_due_counts_by_date_range(today, today + timedelta(days=30*months_ahead))
    avg_daily = sum(d['total'] for d in counts['by_date']) / len(counts['by_date'])

    recommendations = []
    for day_info in counts['by_date']:
        recommended = day_info['total'] >= avg_daily * 0.8
        recommendations.append({
            'date': day_info['date'],
            'recommended': recommended,
            'estimated_items': day_info['total'],
            'reason': 'Natural accumulation point' if recommended else 'Low activity'
        })
    return recommendations
```

---

## Worktree 4: Practice-Question Generation Flow

### Session Lifecycle

```
User schedules session (Calendar)
    ↓
Items pre-computed at scheduling time
    ↓
User clicks "Start Session" (Calendar/Home)
    ↓
POST /api/sessions/{id}/start → status='in_progress'
    ↓
Navigate to /study?session={id}
    ↓
Load pre-selected items OR dynamic queue
    ↓
Practice loop (items, responses, scores)
    ↓
POST /api/sessions/{id}/end → status='completed'
    ↓
Update metrics, sync to Google Calendar
```

### Item Selection Algorithm

```python
def get_items_for_scheduled_session(source_id, session_type, duration_minutes, as_of=None):
    """Pre-compute items at scheduling time."""
    # Get KCs by source
    kcs = get_kcs_for_source(source_id) if source_id else get_all_kcs()

    # Categorize by urgency
    overdue, due_today, new_content = categorize_kcs_by_due_date(kcs, as_of)

    # Select by session type
    if session_type == 'review':
        selected_kc_ids = overdue + due_today + new_content[:5]
    elif session_type == 'new':
        selected_kc_ids = new_content
    else:  # mixed
        selected_kc_ids = overdue + due_today + new_content

    # Get practice items, limit by duration (2.5 min/item)
    items = get_practice_items_for_kcs(selected_kc_ids)
    target_items = int(duration_minutes * 0.4 * 1.2)  # +20% buffer

    return [item['id'] for item in items[:target_items]]
```

### New Database Table: `scheduled_sessions`

```sql
CREATE TABLE scheduled_sessions (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES content_sources(id),
  session_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  items_filtered JSONB NOT NULL,  -- Pre-selected item IDs
  items_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  session_id TEXT UNIQUE REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Worktree 5: System Integration

### New API Endpoints

```python
# Session CRUD
POST   /api/sessions                    # Create scheduled session
GET    /api/sessions                    # List user's sessions
GET    /api/sessions/{id}               # Get session details
PATCH  /api/sessions/{id}               # Update (reschedule, notes)
DELETE /api/sessions/{id}               # Delete scheduled session
POST   /api/sessions/{id}/start         # Start session
POST   /api/sessions/{id}/end           # End session with metrics

# Calendar-specific
GET    /api/sessions/today              # Sessions for today
GET    /api/sessions/upcoming           # Sessions for next 7 days
GET    /api/study/due-counts-by-date    # SM-2 due counts by date range
```

### Home Dashboard Integration

Add "Today's Study Sessions" section:

```jsx
{todaySessions.length > 0 && (
  <div className="mb-6 bg-bg-card rounded-lg border border-accent-progress/30 p-4">
    <h3 className="text-sm font-semibold text-accent-progress mb-3">
      Study Sessions Scheduled for Today ({todaySessions.length})
    </h3>
    {todaySessions.map(session => (
      <div key={session.id} className="flex justify-between p-2 bg-bg-sidebar rounded">
        <div>
          <p className="text-sm font-medium">{session.source_title || 'Mixed Review'}</p>
          <p className="text-xs text-text-secondary">
            {new Date(session.scheduled_for).toLocaleTimeString()}
          </p>
        </div>
        <button onClick={() => navigate(`/study?session=${session.id}`)}>
          Start Now
        </button>
      </div>
    ))}
  </div>
)}
```

### Navigation Flow

```
HOME → "Start Now" → /study?session={id}
CALENDAR → "Start Session" → /study?session={id}
STUDY → Load session params → Practice → End → Update metrics
```

### State Management

Extend `SupabaseContext.jsx` with session methods:
- `getSessions(filters)` - List sessions
- `createSession(data)` - Create scheduled session
- `startSession(id)` - Mark as in_progress
- `endSession(id, metrics)` - Complete with stats

---

## Worktree 6: Google Calendar Integration

### OAuth2 Setup

1. **Google Cloud Console:**
   - Create project, enable Calendar API
   - Create OAuth2 credentials (Client ID, Secret)
   - Configure redirect URIs

2. **Supabase Integration:**
   - Enable Google provider in Supabase Auth
   - Use identity linking for existing email/password users

3. **Token Storage:**
   ```sql
   CREATE TABLE google_calendar_tokens (
     user_id UUID PRIMARY KEY REFERENCES auth.users(id),
     access_token TEXT NOT NULL,
     refresh_token TEXT NOT NULL,  -- Encrypted at rest
     token_expiry TIMESTAMPTZ NOT NULL,
     sync_enabled BOOLEAN DEFAULT false,
     primary_calendar_id TEXT,
     last_sync_at TIMESTAMPTZ
   );
   ```

### Sync Strategy

**Phase 1 (M47):** Push-only (app → Google)
- Sessions created in app sync to Google Calendar
- Store mapping: `session_id → google_event_id`
- Manual "Sync Now" button + automatic on session create

**Phase 2 (M48):** Pull free/busy
- Import busy times to suggest study slots
- Polling every 30 minutes (or webhooks)

**Phase 3 (Future):** Bidirectional sync
- Changes in Google reflected in app
- Conflict resolution logic

### Event Format

```json
{
  "summary": "Study Session: Advanced Python",
  "description": "Learning System Study Session\n\nSource: Advanced Python\nDuration: 30 min",
  "start": { "dateTime": "2026-01-15T14:00:00-05:00" },
  "end": { "dateTime": "2026-01-15T14:30:00-05:00" },
  "colorId": "1",
  "reminders": { "overrides": [{"method": "notification", "minutes": 15}] },
  "extendedProperties": {
    "private": { "learn_system_session_id": "sess_abc123" }
  }
}
```

### UI: Settings Page

```jsx
<CalendarSettings>
  {!syncEnabled ? (
    <button onClick={handleConnect}>Connect Google Calendar</button>
  ) : (
    <div>
      <span className="text-green-600">Connected</span>
      <p>Last synced: {lastSyncAt}</p>
      <button onClick={handleSync}>Sync Now</button>
      <button onClick={handleDisconnect}>Disconnect</button>
    </div>
  )}
</CalendarSettings>
```

---

## Implementation Phases

### M47: Calendar Core (Days 1-8)

**M47a: Bug Fixes & Data Model (Days 1-2)**
- [ ] Run migration: Add `scheduled_for`, `status` columns
- [ ] Migrate existing sessions data
- [ ] Fix CalendarGrid to use `scheduled_for`
- [ ] Fix Calendar.jsx to insert `scheduled_for`

**M47b: Session API (Days 3-4)**
- [ ] Create `learn_system/app/api/routes/sessions.py`
- [ ] Implement session CRUD endpoints
- [ ] Add session status transition logic
- [ ] Update `web/src/lib/api.js` with session functions

**M47c: SM-2 Integration (Days 5-6)**
- [ ] Create `calendar_scheduler.py` with due counts algorithm
- [ ] Add `/api/study/due-counts-by-date` endpoint
- [ ] Update CalendarGrid to fetch and display due counts
- [ ] Add urgency badges to calendar cells

**M47d: UI/UX Overhaul (Days 7-8)**
- [ ] Redesign calendar grid with new indicator system
- [ ] Create SessionDetailPanel component
- [ ] Add mobile responsive layout
- [ ] Implement accessibility (ARIA, keyboard nav)

### M48: System Integration (Days 9-14)

**M48a: Home Dashboard (Days 9-10)**
- [ ] Add "Today's Sessions" section to Home.jsx
- [ ] Implement `/api/sessions/today` endpoint
- [ ] Add "Start Now" navigation

**M48b: Study Integration (Days 11-12)**
- [ ] Update Study.jsx to accept `?session=id` param
- [ ] Load scheduled session params
- [ ] Call start/end session APIs
- [ ] Link session metrics back to scheduled session

**M48c: Practice Flow (Days 13-14)**
- [ ] Create `scheduled_sessions` table
- [ ] Implement item pre-selection at scheduling time
- [ ] Add session preview component
- [ ] Test full lifecycle: schedule → start → practice → end

### M49: Google Calendar (Days 15-20)

**M49a: OAuth Setup (Days 15-16)**
- [ ] Configure Google Cloud Console
- [ ] Set up Supabase Google provider
- [ ] Create token storage schema
- [ ] Implement identity linking flow

**M49b: Push Sync (Days 17-18)**
- [ ] Create GoogleCalendarService
- [ ] Implement session → Google event sync
- [ ] Store event mappings
- [ ] Add retry logic with exponential backoff

**M49c: Settings UI (Days 19-20)**
- [ ] Create CalendarSettings component
- [ ] Add connect/disconnect flows
- [ ] Display sync status
- [ ] Add "Sync Now" button

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `migrations/m47_calendar_data_model.sql` | Create | Schema changes |
| `learn_system/app/api/routes/sessions.py` | Create | Session CRUD API |
| `learn_system/app/study/calendar_scheduler.py` | Create | Due counts algorithm |
| `learn_system/app/api/services/google_calendar_service.py` | Create | Google sync |
| `web/src/lib/api.js` | Modify | Add session API functions |
| `web/src/pages/Calendar.jsx` | Modify | Use new API, show due counts |
| `web/src/components/calendar/CalendarGrid.jsx` | Modify | New visual design |
| `web/src/components/calendar/SessionDetailPanel.jsx` | Create | Session/due list |
| `web/src/pages/Home.jsx` | Modify | Today's sessions section |
| `web/src/pages/Study.jsx` | Modify | Accept session param |
| `web/src/pages/Settings.jsx` | Modify | Calendar settings section |
| `web/src/contexts/SupabaseContext.jsx` | Modify | Session methods |

---

## Success Criteria

1. **Calendar displays SM-2 due counts** per day with color-coded urgency
2. **Scheduled sessions visible** on calendar with type indicators
3. **No field mismatch bug** - sessions appear on correct dates
4. **Full session lifecycle** - schedule → start → practice → complete
5. **Home shows today's sessions** with "Start Now" buttons
6. **Study page accepts session param** and loads correct items
7. **Google Calendar sync works** (push: app → Google)
8. **Mobile responsive** - works on 375px width
9. **Accessible** - keyboard nav, screen reader compatible
10. **Performance** - calendar loads <200ms with 1000 sessions

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Google API rate limits | Exponential backoff, batch sync, polling limits |
| Token refresh failures | Auto-disable sync, notify user, manual re-auth |
| Schema migration breaks existing data | Migration script preserves all data, run verification queries |
| SM-2 due counts slow | Index on `kc_state.next_review_at`, limit date range to 365 days |
| Conflict: scheduled items change before session | Dynamic queue fallback if pre-selected items unavailable |

---

## References

- **UI/UX Research:** Worktree `calendar/ui-ux` - Visual design, accessibility, responsive
- **Data Model Research:** Worktree `calendar/data-model` - Schema, migrations, status workflow
- **Scheduling Research:** Worktree `calendar/scheduling` - SM-2 integration, due counts API
- **Practice Flow Research:** Worktree `calendar/practice` - Item selection, session lifecycle
- **Integration Research:** Worktree `calendar/integration` - API endpoints, navigation flows
- **Google Calendar Research:** Worktree `calendar/api` - OAuth, sync strategy, event format

---

*This document consolidates research from 6 parallel worktrees. Implementation should proceed phase by phase (M47 → M48 → M49) with testing at each milestone boundary.*
