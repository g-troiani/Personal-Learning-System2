# Sources View Implementation Specification

**Status:** Research Complete | Ready for Implementation
**Last Updated:** 2026-01-02

This document specifies the complete implementation of the Sources management feature for the Personal Learning System Web UI. It consolidates research on UI/UX design, file upload flow, backend integration, user journey, and engineering architecture.

---

## Executive Summary

The Sources page is the document library hub where users upload, organize, and manage learning materials. The implementation requires:

1. **Frontend**: React components for source list, upload zone, processing status
2. **Backend API**: FastAPI server wrapping existing Python ingestion pipeline
3. **Async Processing**: Background tasks with database-persisted status for progress tracking
4. **Real-time Updates**: Supabase Realtime subscriptions for processing progress

**Key Constraint:** This is a localhost, single-user tool. Simplicity over complexity.

---

## 1. Architecture Overview

### Service Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
│                                                                     │
│  SourcesPage → SourcesContext → useSources() → Direct Supabase     │
│       │                                                             │
│  UploadZone → useSourceUpload() → HTTP POST → FastAPI              │
│       │                                                             │
│  ProcessingStatus → useSourceProcessing() → Supabase Realtime      │
└─────────────────────────────────────────────────────────────────────┘
          │                       │                      │
          │ Direct reads          │ File upload          │ Status polling
          ▼                       ▼                      ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────┐
│    SUPABASE     │◄────┤   PYTHON API    │────►│  PROCESSING         │
│   (PostgreSQL)  │     │   (FastAPI)     │     │  PIPELINE           │
│                 │     │   port 8000     │     │  (Background Task)  │
└─────────────────┘     └─────────────────┘     └─────────────────────┘
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | FastAPI | Async support, simple, reuses existing code |
| Processing | BackgroundTasks (in-process) | No Celery/Redis overhead for localhost |
| Progress tracking | Supabase Realtime | Frontend already has Supabase client |
| File storage | Process and discard | Matches CLI behavior, no storage costs |
| State management | Context + Custom hooks | Appropriate for single-user app |

---

## 2. Database Schema Changes

### Add to `content_sources` table:

```sql
-- New columns for processing status tracking
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_step TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

-- Status values: pending, extracting_text, extracting_kcs, generating_items, ready, error
-- Enable realtime for this table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE content_sources;
```

### Optional: Separate `processing_jobs` table

For more robust job tracking (recommended for production):

```sql
CREATE TABLE processing_jobs (
    id TEXT PRIMARY KEY,
    source_id TEXT REFERENCES content_sources(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued',
    progress_percent INTEGER DEFAULT 0,
    current_step TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    kc_count INTEGER,
    item_count INTEGER
);

CREATE INDEX idx_jobs_source ON processing_jobs(source_id);
ALTER PUBLICATION supabase_realtime ADD TABLE processing_jobs;
```

---

## 3. Backend API Specification

### File Structure

```
learn_system/app/api/
├── __init__.py
├── server.py          # FastAPI app factory
├── routes/
│   ├── __init__.py
│   ├── sources.py     # /api/sources endpoints
│   └── health.py      # /api/health
├── models/
│   ├── __init__.py
│   └── schemas.py     # Pydantic request/response models
└── services/
    ├── __init__.py
    └── processing.py  # Background task orchestration
```

### API Endpoints

#### `POST /api/sources/upload`

Upload a document and start processing.

**Request:** `multipart/form-data`
- `file`: Document file (PDF, DOCX, MD, TXT)
- `domain`: Knowledge domain (optional, default: "general")

**Response:** `201 Created`
```json
{
  "source_id": "src_abc123",
  "title": "document.pdf",
  "status": "pending",
  "message": "Document uploaded. Processing started."
}
```

#### `GET /api/sources/{source_id}/status`

Get processing status (fallback for polling).

**Response:**
```json
{
  "source_id": "src_abc123",
  "status": "extracting_kcs",
  "progress": 35,
  "current_step": "Extracting knowledge components...",
  "kc_count": 0,
  "item_count": 0,
  "error": null
}
```

#### `POST /api/sources/{source_id}/retry`

Retry failed processing.

**Response:** `202 Accepted`

#### `DELETE /api/sources/{source_id}`

Delete a source and all related data.

**Response:** `204 No Content`

#### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "supabase": true,
  "anthropic_api": true
}
```

### Processing Pipeline

```python
class ProcessingPipeline:
    """Orchestrates document ingestion with status updates."""

    def run(self, source_id: str):
        """Run full processing pipeline with progress updates."""
        try:
            # Stage 1: Extract text (already done during upload)
            self.update_status(source_id, 'extracting_text', 10)

            # Stage 2: Extract knowledge components
            self.update_status(source_id, 'extracting_kcs', 25)
            kc_count = extract_and_store_kcs(source_id, content, domain)

            # Stage 3: Generate practice items
            self.update_status(source_id, 'generating_items', 60)
            item_count = generate_all_items(source_id)

            # Complete
            self.update_status(source_id, 'ready', 100, kc_count=kc_count, item_count=item_count)

        except Exception as e:
            self.update_status(source_id, 'error', error_message=str(e))
            raise
```

### CORS Configuration

```python
# For localhost development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type"],
)
```

---

## 4. Frontend Components

### File Structure

```
web/src/
├── pages/
│   └── Sources.jsx              # Main page container
│
├── components/sources/
│   ├── SourcesHeader.jsx        # Page title + subtitle
│   ├── SourcesToolbar.jsx       # Search, filters, sort, upload button
│   ├── UploadZone.jsx           # Drag-drop upload area
│   ├── UploadProgress.jsx       # Multi-step progress indicator
│   ├── SourcesList.jsx          # Grid/list of sources
│   ├── SourceCard.jsx           # Individual source card
│   ├── SourceDetailPanel.jsx    # Expanded source details
│   ├── ProcessingStatus.jsx     # Real-time processing indicator
│   └── EmptyState.jsx           # Empty library state
│
├── contexts/
│   └── SourcesContext.jsx       # Sources state management
│
├── hooks/
│   ├── useSources.js            # Fetch and cache sources
│   ├── useSourceUpload.js       # Upload flow with optimistic updates
│   └── useSourceProcessing.js   # Processing status tracking
│
└── services/
    └── sourcesApi.js            # API client for backend
```

### Component Hierarchy

```
Sources.jsx (page)
├── SourcesHeader
├── SourcesToolbar
│   ├── SearchBar (existing pattern)
│   ├── FilterDropdown
│   ├── SortDropdown
│   └── UploadButton → opens UploadZone
├── UploadZone (collapsible/modal)
│   ├── DragDropArea
│   ├── FileTypeIndicators
│   └── UploadProgress (when active)
├── SourcesList
│   ├── SourceCard (for each source)
│   │   ├── SourceIcon (emoji)
│   │   ├── SourceInfo (title, domain, date)
│   │   ├── SourceStats (KCs, items, mastery)
│   │   └── ProcessingStatus (if processing)
│   └── EmptyState (when no sources)
└── SourceDetailPanel (optional drawer/modal)
```

### SourceCard Information Display

Each card shows:
1. **Visual**: Domain emoji (existing SourceCard pattern)
2. **Primary**: Title (truncated), domain badge, date
3. **Stats**: KC count, item count, mastery %, due/overdue
4. **Status**: Complete (green check), Processing (spinner), Failed (red X)
5. **Actions**: Study, View Details, Delete (dropdown)

### Upload Zone UX

**States:**
1. **Idle**: Dashed border, "Drag & drop or click to upload"
2. **Dragover**: Border highlight with accent color
3. **Uploading**: File name, progress bar
4. **Processing**: Multi-step indicator (Extract → Analyze → Generate)
5. **Complete**: Success message, "Start Learning" button
6. **Error**: Error message, "Retry" button

**Processing Steps Display:**
```
[x] Uploading document
[x] Extracting text
[ ] Analyzing content (this may take a minute)
[ ] Generating practice items
```

---

## 5. State Management

### SourcesContext Shape

```javascript
{
  sources: [
    {
      id: 'src_abc123',
      title: 'Document.pdf',
      domain: 'ai_ml',
      status: 'ready',  // pending | extracting_kcs | generating_items | ready | error
      kc_count: 12,
      item_count: 36,
      mastery: 0.45,
      ingested_at: '2026-01-02T10:30:00Z',
      error_message: null
    }
  ],

  uploadQueue: [
    {
      tempId: 'temp_123',
      file: File,
      status: 'uploading',
      progress: 45,
      error: null
    }
  ],

  lastFetch: 1704123456789
}
```

### Custom Hooks

**useSources():**
- Fetches source list with caching (30s TTL)
- Provides `refreshSources(force)` for manual refresh
- Computes derived stats (mastery, counts)

**useSourceUpload():**
- Returns `{ upload, isUploading, progress, error }`
- Handles file validation
- Adds to list optimistically
- Triggers processing after upload

**useSourceProcessing(sourceId):**
- Subscribes to Supabase Realtime for status changes
- Falls back to polling if Realtime unavailable
- Returns `{ status, progress, error, retry }`

---

## 6. User Journey Flows

### First-Time User (Empty State → First Practice)

```
1. Land on Home → Empty state with "Add Your First Document" CTA
2. Click CTA → Navigate to Sources with upload panel open
3. Drag/drop file → File appears with name, size, format badge
4. Click "Start Processing" → Processing card appears in grid
5. Wait ~30-60s → Card updates: "12 concepts extracted, 36 items ready"
6. Click card → Study session begins
7. Complete a few items → Session summary
8. Return to Sources → Card shows mastery progress
```

### Returning User (Upload New Source)

```
1. Navigate to Sources → See existing sources grid
2. Click "Add Document" → Upload zone expands
3. Upload new file → New processing card appears
4. Can continue browsing while processing
5. Toast notification on complete
6. New source ready for practice
```

### Error Recovery

```
1. Processing fails (LLM error, etc.)
2. Card shows error indicator + "Retry" button
3. User clicks Retry → Processing restarts from failed step
4. On persistent failure → Help text, contact support option
```

---

## 7. File Validation Rules

### Client-Side (Immediate Feedback)

| Check | Rule | Error Message |
|-------|------|---------------|
| File type | `.pdf, .docx, .doc, .md, .txt` | "Only PDF, DOCX, and text files supported" |
| File size | Max 25 MB | "File exceeds 25 MB limit" |
| Empty file | Size > 0 | "File appears to be empty" |

### Server-Side (Security)

| Check | Method | Action |
|-------|--------|--------|
| Magic bytes | Check file header | Reject if mismatch |
| Size limit | Re-validate | Reject if exceeds |
| Filename | Sanitize | Remove path traversal |

### Supported Formats (from extractors.py)

```python
SUPPORTED_EXTENSIONS = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.md': 'text/markdown',
    '.markdown': 'text/markdown',
    '.txt': 'text/plain',
    '.text': 'text/plain'
}
```

---

## 8. Error Handling Strategy

### Error Categories

| Category | Examples | Recovery |
|----------|----------|----------|
| **Validation** | Wrong type, too large | Immediate rejection |
| **Network** | Connection lost, timeout | Retry with backoff |
| **Processing** | LLM rate limit, context too long | Store error, allow retry |
| **Database** | Constraint violation | Log, notify, allow retry |

### User-Friendly Messages

```javascript
const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'This file exceeds the 25MB limit.',
  UNSUPPORTED_TYPE: 'Only PDF, DOCX, and text files are supported.',
  EXTRACTION_FAILED: 'Could not extract text. File may be corrupted.',
  LLM_RATE_LIMIT: 'AI service is busy. Will retry automatically.',
  LLM_CONTEXT_LENGTH: 'Document too long. Try splitting into parts.',
  NETWORK_ERROR: 'Connection failed. Check your internet.',
}
```

### Retry Mechanism

```javascript
// Automatic retry with exponential backoff
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1 || !isRetryable(error)) throw error
      await sleep(Math.pow(2, i) * 1000)  // 1s, 2s, 4s
    }
  }
}
```

---

## 9. Implementation Milestones

### M16: Sources Page Foundation (2-3 days)

**Goal:** Basic source list with existing data display

**Tasks:**
1. Create `SourcesContext` with state management
2. Create `useSources` hook for data fetching
3. Build `SourcesList` component with grid layout
4. Build `SourceCard` component (reuse existing SourceCard pattern)
5. Build `EmptyState` component
6. Implement filter and sort functionality
7. Wire up to existing Supabase data

**Verification:**
- Sources page shows all existing sources from database
- Cards display title, emoji, mastery, due counts
- Click navigates to `/study?source={id}`

### M17: Upload UI (2-3 days)

**Goal:** Complete upload interface without backend

**Tasks:**
1. Build `UploadZone` component with drag-drop
2. Build `UploadProgress` component with steps
3. Implement client-side file validation
4. Create `useSourceUpload` hook (mock API)
5. Add optimistic updates to `SourcesContext`
6. Style upload states (idle, dragover, uploading, complete, error)

**Verification:**
- Can drag-drop or click to select files
- Invalid files show immediate error
- Upload progress UI works (mocked)
- Optimistic card appears in list

### M18: Backend API (2-3 days)

**Goal:** FastAPI server with processing endpoints

**Tasks:**
1. Scaffold FastAPI application in `learn_system/app/api/`
2. Create `/api/sources/upload` endpoint
3. Create `/api/sources/{id}/status` endpoint
4. Create `/api/sources/{id}/retry` endpoint
5. Create `/api/health` endpoint
6. Integrate with existing `ingest_document()` pipeline
7. Add CORS middleware for localhost
8. Create `ProcessingPipeline` class with status updates

**Verification:**
- `curl -X POST /api/sources/upload -F file=@doc.pdf` works
- Processing updates status in database
- Frontend can poll for status

### M19: Real-time Processing (2 days)

**Goal:** Live progress updates during processing

**Tasks:**
1. Create `useSourceProcessing` hook with Supabase Realtime
2. Add polling fallback if Realtime fails
3. Wire `ProcessingStatus` component to hook
4. Update `SourceCard` to show processing state
5. Add toast notification on completion
6. Test full upload-to-ready flow

**Verification:**
- Upload a document
- See real-time progress in card
- Toast appears when ready
- Can start studying immediately

### M20: Error Handling & Polish (2 days)

**Goal:** Production-ready error handling

**Tasks:**
1. Add error boundaries to Sources page
2. Implement retry mechanism for failed processing
3. Add user-friendly error messages
4. Build error states for SourceCard
5. Add delete source functionality
6. Add source detail panel/modal
7. Mobile responsive testing

**Verification:**
- Failed processing shows retry button
- Error messages are clear and actionable
- Delete works with confirmation
- Mobile layout works

---

## 10. Testing Checklist

### Unit Tests

- [ ] `useSources` hook - fetching, caching, refresh
- [ ] `useSourceUpload` hook - validation, optimistic updates
- [ ] `useSourceProcessing` hook - polling, status parsing
- [ ] File validation utilities
- [ ] Error message mapping

### Integration Tests

- [ ] API `/api/sources/upload` - accepts valid files
- [ ] API `/api/sources/upload` - rejects invalid files
- [ ] API `/api/sources/{id}/status` - returns correct status
- [ ] Processing pipeline - updates status correctly
- [ ] Supabase Realtime - receives status changes

### E2E Tests

- [ ] First-time user can upload and study
- [ ] Processing progress displays correctly
- [ ] Error recovery with retry works
- [ ] Delete source removes from list

---

## 11. How to Run

### Start Backend API

```bash
cd learn_system
source .venv/bin/activate
uvicorn app.api.server:app --reload --port 8000
```

### Start Frontend Dev Server

```bash
cd web
VITE_SUPABASE_URL=<url> VITE_SUPABASE_ANON_KEY=<key> npm run dev
```

### Environment Variables (Backend)

```
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
ANTHROPIC_API_KEY=<your-anthropic-key>
```

---

## 12. Open Questions (To Clarify Before Implementation)

1. **Domain selection:** Should upload require domain selection, or default to "general"?
2. **Duplicate handling:** What happens if same document uploaded twice? Warn/Allow/Block?
3. **Source detail view:** Full page route (`/sources/:id`) or modal overlay?
4. **Re-processing:** Should users be able to re-process a source with different settings?
5. **Bulk upload:** Support multiple files at once? If so, sequential or parallel?

---

## Appendix A: Visual States Reference

### Source Card States

| State | Border | Badge | Progress | Actions |
|-------|--------|-------|----------|---------|
| Ready | Default | None | Hidden | Study, Delete |
| Processing | Amber pulse | "Processing" | Visible | Cancel |
| New | Green | "New" | Hidden | Start, Delete |
| Error | Red | "Failed" | Hidden | Retry, Delete |
| Uploading | Dashed | "Uploading" | Spinner | Cancel |

### Upload Zone States

| State | Border | Background | Content |
|-------|--------|------------|---------|
| Idle | Dashed gray | Transparent | Icon + text |
| Dragover | Solid accent | Accent/10 | "Drop here" |
| Uploading | Solid gray | White | Progress bar |
| Processing | Solid gray | White | Step indicator |
| Complete | Solid green | Green/10 | Success + CTA |
| Error | Solid red | Red/10 | Error + retry |

---

## Appendix B: API Request/Response Examples

### Upload Request

```bash
curl -X POST http://localhost:8000/api/sources/upload \
  -F "file=@/path/to/document.pdf" \
  -F "domain=ai_ml"
```

### Upload Response

```json
{
  "source_id": "src_1704123456789",
  "title": "document.pdf",
  "status": "pending",
  "domain": "ai_ml",
  "word_count": 15234,
  "message": "Document uploaded. Processing started."
}
```

### Status Response (During Processing)

```json
{
  "source_id": "src_1704123456789",
  "status": "extracting_kcs",
  "progress": 35,
  "current_step": "Analyzing content with AI...",
  "kc_count": 0,
  "item_count": 0,
  "error": null
}
```

### Status Response (Complete)

```json
{
  "source_id": "src_1704123456789",
  "status": "ready",
  "progress": 100,
  "current_step": null,
  "kc_count": 12,
  "item_count": 36,
  "error": null
}
```

---

## 13. Integration Validation Report

**Validated:** 2026-01-02

This section documents how the specification integrates with the existing codebase.

### ✅ Compatible Components

| Component | Existing | Spec Alignment |
|-----------|----------|----------------|
| ID generation | `generate_id('src')` in queries.py | ✅ Spec uses `src_abc123` format |
| Database client | `get_client()` singleton in connection.py | ✅ FastAPI can reuse this |
| Config | `get_api_key()`, `get_supabase_url()` in config.py | ✅ Spec references these correctly |
| Routes | `/sources`, `/sources/:id` in App.jsx | ✅ Routes already exist |
| File extractors | .pdf, .docx, .md, .txt in extractors.py | ✅ Spec lists same formats |
| Ingestion | `ingest_document()` with `progress_callback` | ✅ ProcessingPipeline can wrap this |
| SourceCard | `components/home/SourceCard.jsx` | ✅ Spec references reusing pattern |

### ⚠️ Items Requiring Clarification

#### 1. Status vs Processing Status Fields

**Existing:** `content_sources.status` = 'active' (for active/archived sources)

**Spec proposes:** `content_sources.processing_status` = 'pending|extracting_kcs|...|ready|error'

**Resolution:** These are different concerns:
- `status` = lifecycle state (active, archived)
- `processing_status` = ingestion pipeline state

Keep both fields. Update `insert_source()` to also set `processing_status='pending'` initially.

#### 2. SourcesContext vs SupabaseContext

**Existing:** `SupabaseContext.jsx` already has:
- `sources` state
- `fetchSources()` method
- `getDueCounts()`, `getMasteryBySource()` methods

**Spec proposes:** Separate `SourcesContext.jsx`

**Resolution Options:**
1. **Extend SupabaseContext** (recommended) - Add upload queue and processing hooks to existing context
2. **Separate Context** - Create SourcesContext that imports from SupabaseContext

**Recommendation:** Option 1 for M16, then extract to separate context if complexity warrants it in M17.

#### 3. Legacy .doc File Support

**Existing:** `extractors.py` maps `.doc` → `extract_docx()` with comment "Try docx extractor for .doc"

**Issue:** True legacy `.doc` files (binary format) won't work with python-docx.

**Resolution:** Document in user-facing error messages: "Only .docx files are fully supported. Legacy .doc files may fail - please convert to .docx first."

### 🔧 Required Dependency Updates

Add to `learn_system/requirements.txt`:

```
fastapi>=0.109.0
uvicorn>=0.27.0
python-multipart>=0.0.6
```

### 📁 File Structure Alignment

**Existing folder structure:**
```
web/src/
├── components/
│   ├── home/
│   │   └── SourceCard.jsx  ← exists, reuse pattern
│   ├── analytics/
│   ├── calendar/
│   ├── progress/
│   └── review/
└── pages/
    └── Sources.jsx  ← placeholder, ready for implementation
```

**Spec proposes:** `components/sources/` folder

**Decision:** Create `components/sources/` to follow established pattern. Can import `SourceCard.jsx` from `home/` or move to `sources/` and re-export from `home/`.

### 🔌 API Integration Notes

1. **FastAPI server** runs alongside existing CLI on port 8000
2. **No conflict** with current CLI - they share Supabase backend
3. **CORS** should use environment variable: `VITE_DEV_SERVER_URL` instead of hardcoded `localhost:5173`
4. **Existing `ingest_document()`** already handles the full pipeline - FastAPI wrapper only needs to:
   - Receive file upload
   - Save to temp location
   - Call `ingest_document()` with temp path
   - Update `processing_status` at each stage
   - Clean up temp file

### ✅ Database Schema Validation

The proposed schema additions are **additive** and don't conflict with existing schema:

```sql
-- These columns DON'T EXIST yet - safe to add
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_step TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;
```

**Note:** Run migrations in Supabase dashboard before starting M16.

---

*This specification is ready for implementation. Hand to any senior engineer with access to the codebase.*
