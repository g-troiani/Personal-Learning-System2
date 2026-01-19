# Sources Feature Milestones Archive

**Last Updated:** 2026-01-19
**Summary:** Implementation details for M16-M20 (file upload, FastAPI backend, real-time processing) and M49 (source-grounded practice items)

## Critical Gotchas

**Environment Configuration:**
- Single `.env` file in project root serves both Python (no `export` prefix) and Vite (`VITE_` prefix required)
- Shell env vars override `.env` files - run `env | grep VITE_` to diagnose connection issues
- API server must run on port 8001 to match frontend: `uvicorn app.api.server:app --port 8001`

**Supabase Keys:**
- **CRITICAL:** JS client requires legacy anon key (starts with `eyJhbG...`), NOT the new `sb_publishable_` format
- To get legacy key: Supabase Dashboard → Settings → API Keys → "Legacy anon, service_role API keys" tab
- Python library v2.27.0+ required for newer key formats

**LLM APIs:**
- Groq model `qwen-qwq-32b` deprecated → use `qwen/qwen3-32b`
- Groq rate limits can cause stuck processing - retry logic helps but timeouts needed
- Practice items: 3 per KC consistently (predictable 3:1 ratio)

**Python 3.9 Compatibility:**
- Use `Optional[X]` instead of `X | None`, `List[Dict]` instead of `list[dict]`
- Timestamp parsing needs try-except for variable microsecond precision

## Quick Reference

- **API Server:** `learn_system/app/api/server.py` (port 8001)
- **Start API:** `cd learn_system && uvicorn app.api.server:app --reload --port 8001`
- **API Endpoints:** POST /api/sources/upload, GET /api/sources/{id}/status, POST /api/sources/{id}/retry, DELETE /api/sources/{id}
- **Dependencies:** fastapi, uvicorn, python-multipart
- **File Types:** .pdf, .docx, .md, .txt (25MB max)

## Milestone Details

### Sources View Research & Specification (2026-01-02)

Foundation research before implementation.

- Created NEW FEATURES.md with comprehensive Sources view specification
- Ran 5 parallel research agents covering: UI/UX design, file upload flow, backend integration, user journey, engineering architecture
- Documented FastAPI backend API design (upload, status, retry, health endpoints)
- Specified Supabase Realtime for processing progress tracking
- Designed SourcesContext state management with custom hooks (useSources, useSourceUpload, useSourceProcessing)
- Defined 5 implementation milestones (M16-M20)
- Validated integration with existing codebase:
  - Existing patterns confirmed: generate_id('src'), get_client(), SupabaseContext, SourceCard component
  - Schema additions are additive (processing_status, processing_progress, etc.)
  - FastAPI requires new dependencies: fastapi, uvicorn, python-multipart
  - Existing ingest_document() has progress_callback - can wrap with status updates

### Milestone 16: Sources Page Foundation (2026-01-02)

List display with filtering and sorting.

- Created useSources hook in web/src/hooks/useSources.js with data fetching, filtering, sorting, and caching
- Created SourcesHeader.jsx with page title and document count
- Created SourcesToolbar.jsx with search input, domain filter dropdown, sort by dropdown, sort order toggle, and Add Document button
- Created SourcesList.jsx with responsive grid layout and enhanced SourceCard showing emoji, title, domain badge, KC count, item count, mastery progress, due/overdue counts
- Created EmptyState.jsx with two variants: no sources (CTA to add first document) and no filter results
- Extended SupabaseContext with upload queue state management (addToUploadQueue, updateUploadItem, removeFromUploadQueue, clearCompletedUploads)
- Wired Sources.jsx page with all components and placeholder upload modal
- Verified: search filters by title/title, domain filter works, sort by name/date/mastery works, card click navigates to /study?source={id}

### Milestone 17: Upload UI (2026-01-02)

Drag-drop zone and file validation.

- Created UploadZone.jsx with drag-drop area supporting idle, dragover, uploading, processing, complete, and error visual states
- Created UploadProgress.jsx showing 4-step progress indicator (Upload → Extract → Analyze → Generate) with step icons and progress bar
- Created useSourceUpload hook in web/src/hooks/useSourceUpload.js with file validation (type, size), upload state management, and optimistic source creation
- Supported file types: .pdf, .docx, .md, .txt with 25MB max size
- Simulated upload and processing flow (mocked timing for M17 - real API in M18)
- Integrated UploadZone into Sources.jsx with show/hide toggle via Add Document button
- Added upload success notification with KC count and item count display
- Verified: upload zone displays, click to browse works, close button works, file type messaging correct

### Milestone 18: FastAPI Backend (2026-01-02)

Upload endpoint and processing pipeline.

- Created FastAPI server in app/api/server.py with CORS middleware for frontend access
- Created Pydantic schemas in app/api/models/schemas.py for request/response validation (ProcessingStatus enum, UploadResponse, ProcessingStatusResponse, etc.)
- Created health endpoint in app/api/routes/health.py returning status, version, timestamp
- Created ProcessingPipeline class in app/api/services/processing.py wrapping ingest_document() with status updates to Supabase
- Created sources routes in app/api/routes/sources.py with endpoints: POST /upload, GET /{id}/status, POST /{id}/retry, DELETE /{id}
- File upload uses BackgroundTasks to process documents asynchronously
- Processing status updates: pending → extracting_text → extracting_kcs → generating_items → ready (or error)
- Created database migration file migrations/001_add_processing_status.sql
- Updated requirements.txt with fastapi, uvicorn, python-multipart
- Verified: API server starts on port 8001, health endpoint returns 200 OK

### Milestone 19: Real-time Processing Progress (2026-01-02)

Status tracking and UI updates.

- Created useSourceProcessing hook in web/src/hooks/useSourceProcessing.js with Supabase Realtime subscription and polling fallback
- Created ProcessingStatus component in web/src/components/sources/ProcessingStatus.jsx showing progress bar, step indicators, and status badges
- Created ProcessingBadge component for compact inline status display on source cards
- Updated SourcesList.jsx SourceCard to handle processing states: pending, extracting_text, extracting_kcs, generating_items, ready, error
- Added retry button on error state cards with onRetry handler
- Wired UploadZone.jsx to real API: fetch to POST /api/sources/upload, monitors progress via useSourceProcessing hook
- Added shimmer animation CSS for progress bar visual feedback
- Updated Sources.jsx with handleRetry for failed sources using POST /api/sources/{id}/retry
- Updated learn_system/.env with correct Supabase key format (sb_publishable_)
- Upgraded supabase Python library (2.0.3 → 2.27.0) and websockets dependency for compatibility
- Ran database migration in Supabase SQL Editor: ALTER TABLE to add processing_status, processing_progress, processing_step, error_message, processing_started_at, processing_completed_at columns
- Verified end-to-end upload flow: curl POST /api/sources/upload → source created with pending status → processing ran through all stages → status='ready', progress=100, step='Processing complete!'
- Test source src_88d49c1e (test_upload.md) successfully processed in ~4 minutes with 61 words extracted
- Browser upload test (2026-01-02): Programmatically triggered file upload via JavaScript, upload zone UI worked correctly (file selection, Upload & Process button), API received request (200 OK), processing completed successfully
- Test source src_7f66a8d2 (browser_test.md) processed: 10 KCs extracted, 30 practice items generated, appears in Sources list after refresh
- Fixed Realtime subscription issue (2026-01-02): Root cause was content_sources table not in supabase_realtime publication. Ran `ALTER PUBLICATION supabase_realtime ADD TABLE public.content_sources;` in Supabase SQL Editor. Also added polling fallback in useSourceProcessing.js to always poll every 2 seconds alongside Realtime subscription, ensuring reliable progress updates even if Realtime fails. Verified: upload progress now displays correctly and updates to "ready" state with KC/item counts.

### Milestone 20: Error Handling and Polish (2026-01-03)

Delete UI, SourceDetailPanel, confirmation dialogs.

- Created ConfirmationDialog component in web/src/components/shared/ConfirmationDialog.jsx with:
  - Danger/warning variants with appropriate icon colors
  - Loading state for async operations
  - Escape key and backdrop click to close
  - Focus trap on confirm button
  - Smooth animations (fade-in, zoom-in)
- Added SourceMenu dropdown to SourceCard with "View Details" and "Delete" options
  - Three-dot menu icon in card header
  - Click-outside and Escape key to close
  - Red color styling for Delete action
- Created SourceDetailPanel slide-in drawer in web/src/components/sources/SourceDetailPanel.jsx:
  - Full source information: title, domain, emoji, stats
  - Quick stats cards: Concepts count, Items count, Mastery %
  - Due items summary: overdue (red), due today (amber), new (cyan)
  - Document info section: ingested date, word count, content type, processed date
  - Knowledge Components list grouped by type (Factual, Conceptual, Procedural)
  - Expandable KC items showing description and mastery progress bar
  - Footer with "Study Now" and "Delete" buttons
- Wired Sources.jsx with delete and view details handlers:
  - handleDeleteRequest opens confirmation dialog
  - handleDeleteConfirm calls DELETE /api/sources/{id} endpoint
  - handleViewDetails opens SourceDetailPanel
  - States for dialog/panel visibility and loading
- Added CSS animation utilities to index.css:
  - fadeIn, zoomIn95, slideInFromRight, slideInFromTop2 keyframes
  - animate-in utility class with duration variants
- Verified in browser:
  - Three-dot menu opens on source cards
  - "View Details" opens SourceDetailPanel with correct data
  - KC items expand to show description and mastery
  - Escape key closes both panel and dialog
  - "Delete" option opens confirmation dialog with source name and item counts
  - Cancel closes dialog without deleting
  - Backend DELETE endpoint already functional from M18

### M49: Source-Grounded Practice Items (2026-01-19)

**Goal:** Practice items grounded in actual source documents, not LLM general knowledge.

**Problem:** `source_excerpt` field in `knowledge_components` existed but was always NULL. Practice items tested concepts not present in source material (e.g., asking about "three types of attention" when source only mentioned self-attention).

**Important Nuance:** Grounding ≠ memorization. Valid items may require:
- Reasoning/inference from source material
- Prerequisite knowledge for the domain (e.g., Terraform docs can assume Python knowledge)
- Synthesis of multiple concepts within same source

The problem is items requiring knowledge **not derivable from source + reasonable prerequisites**.

**Implementation:**

| Phase | Task | Files | Lines |
|-------|------|-------|-------|
| 1 | Update KC extraction prompt | `kc_extractor.py` | 65-97 |
| 2 | Parse source_excerpt from LLM | `kc_extractor.py` | 226-247 |
| 3 | Pass source_excerpt to batch insert | `kc_extractor.py` | 346-358 |
| 4 | Add grounding constraints to templates | `templates.py` | All 4 functions |

**Key Code - KC Extraction Prompt (kc_extractor.py:75):**
```
7. source_excerpt: The VERBATIM text from the content (50-200 words) that this KC is derived from. Copy exact quotes from the source - do not paraphrase. Include enough context to understand the concept.
```

**Key Code - Grounding Section (templates.py:28-43):**
```python
---SOURCE EXCERPT---
{excerpt}
---END SOURCE---

GROUNDING RULES (CRITICAL):
- Questions must be answerable by reading the source excerpt + applying reasonable prerequisite knowledge for the domain
- You MAY require reasoning, inference, or application of concepts from the excerpt
- You MAY assume foundational knowledge appropriate to the topic
- DO NOT require knowledge of facts, terminology, or concepts not mentioned in the excerpt unless they are obvious prerequisites
- DO NOT invent specific details, numbers, or examples not present in or derivable from the excerpt
```

**Files Modified:**
- `learn_system/app/ingestion/kc_extractor.py` - Prompt update, parsing, storage
- `learn_system/app/practice/templates.py` - Added `_get_grounding_section()`, updated all 4 template functions

**No Changes Required:**
- Database schema (`source_excerpt` already existed)
- API contracts (field already in KC model)
- Frontend (already displays `source_excerpt` when present)

**Migration Strategy:** Forward-only. Only new ingestions get grounded items. Existing KCs unchanged. Users can re-ingest for grounding.

**Verification:**
```sql
SELECT name, LEFT(source_excerpt, 100) as excerpt_preview
FROM knowledge_components
WHERE source_excerpt IS NOT NULL
ORDER BY created_at DESC LIMIT 10;
```

**Success Criteria:**
- >95% of new KCs have non-empty source_excerpt
- 100% of items answerable from excerpt + reasonable prerequisites
- Existing items (NULL excerpt) still functional (backward compatible)

## Cross-References

- Related decisions: decisions/architecture.md (FastAPI choice, async processing)
- Related schemas: schemas/api.md (endpoint definitions, Pydantic models)
- Related milestones: milestones/webui_core.md (extends base UI)
