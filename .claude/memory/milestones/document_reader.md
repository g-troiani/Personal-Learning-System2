# Document Reader Feature - M30-M40, M48

**Status:** Complete (2026-01-18)
**Purpose:** AlphaXiv-style document reader for reading uploads before practice

## Overview

Implements in-browser document reading with: PDF/Markdown/DOCX/PPTX/text rendering, sidebar TOC, text selection with highlights, AI chat, notes, reading progress tracking, and zen mode. Flow: upload -> read/study -> practice.

## M38: Document Viewer Fidelity (2026-01-06)

**Goal:** DOCX files render with full visual fidelity instead of plain text.

**Implementation:**
- `DOCXRenderer.jsx` (132 lines) - Uses docx-preview library's `renderAsync()` API
- `docx.css` (136 lines) - Styles for headings, tables, images, lists, links, blockquotes
- `ReaderContent.jsx` updated - Routes 'docx' content type to DOCXRenderer
- `docx-preview@0.3.7` installed

**Features Verified:**
- ✅ Headings render with proper hierarchy and teal color
- ✅ Tables display with borders, headers, alternating rows
- ✅ Bold/italic text preserved
- ✅ Bullet points and numbered lists formatted
- ✅ Text selection works on rendered DOCX
- ✅ Selection tooltip (Ask AI, Highlight, Copy) functions
- ✅ Highlights persist after page refresh (saved to database)

**Key Files:**
- `web/src/components/reader/DOCXRenderer.jsx` - Main renderer with AnnotationLayer integration
- `web/src/styles/docx.css` - DOCX-specific styling
- `web/src/components/reader/ReaderContent.jsx` - Content type routing (line 18, 33, 125-141)

## M39: PDF Highlighting (2026-01-06)

**Goal:** Users can highlight text in PDFs and see those highlights persist across sessions.

**The Problem:**
PDF highlighting wasn't implemented. UI existed (SelectionTooltip, useTextSelection, useAnnotations), highlights saved to database, but:
1. `ReaderContent.jsx` didn't pass `highlights` prop to `PDFRenderer`
2. `PDFRenderer.jsx` had no highlight rendering logic
3. Offset-based positioning incompatible with PDF's multi-page structure

**Implementation:**
- Phase 0: Wired up highlights prop to PDFRenderer in ReaderContent.jsx
- Phase 1: Database migration added `position_type` and `pdf_rects` columns to annotations
- Phase 2: Updated useTextSelection for PDF-aware page-based selection
- Phase 3: Updated PDFRenderer with `data-page-number` attributes on page wrappers
- Phase 4: Created PDFHighlightLayer component for overlay rendering
- Phase 5: Updated useAnnotations to handle PDF position type and sorting

**Key Files:**
- `web/src/components/reader/PDFHighlightLayer.jsx` - Per-page highlight overlay
- `web/src/hooks/useTextSelection.js` - PDF page detection, percentage-based rects
- `web/src/hooks/useAnnotations.js` - PDF position type handling

**Coordinate System:**
- Uses percentage-based coordinates (x%, y%, width%, height%) relative to page dimensions
- Survives zoom/scale changes
- Character offsets from Markdown/Text are incompatible with PDF's multi-page structure

**Limitations:**
- No cross-page selection (react-pdf limitation)
- No rotation support (deferred)

## M40: PowerPoint Support (2026-01-06)

**Goal:** Upload PowerPoint (.pptx) presentations and view in document reader with full visual fidelity.

**Implementation:**
1. **Text extraction:** python-pptx extracts text from slides, tables, speaker notes for KC generation
2. **PDF conversion:** LibreOffice (local, no Docker) converts PPTX to PDF for viewing
3. **Display:** Existing PDFRenderer displays the converted PDF
4. **Highlighting:** Existing PDF highlighting works on converted output

**Key Files:**
- `learn_system/app/services/extractors.py` - `extract_pptx()` function
- `learn_system/app/services/conversion.py` - `convert_pptx_to_pdf()` using LibreOffice
- `learn_system/app/api/sources.py` - PPTX handling, `/api/sources/{id}/pdf-url` endpoint
- `web/src/components/reader/ReaderContent.jsx` - PPTX content type routing

**Database Changes:**
- `slide_count` column added to content_sources
- `converted_pdf_path` column for PDF storage path

**Dependencies:**
- Backend: `python-pptx>=1.0.0`
- System: LibreOffice (`soffice --headless --convert-to pdf`)

**CRITICAL WARNING:** Do NOT use pptx2html library - abandoned 8 years, unpatched XSS vulnerability.

**Limitations:**
- Animations/transitions lost (slides become static PDF)
- SmartArt text may not extract (python-pptx limitation)
- Conversion latency 2-5 seconds per presentation

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  <- Back   Title   [PDF|Blog]   [Zen]   [Start Practice]        │
├────────────┬────────────────────────────────────────────────────┤
│  SIDEBAR   │   DOCUMENT AREA          │   ASSISTANT PANEL      │
│  (existing)│                          │   (collapsible)        │
│            │   [PDF/Markdown/Text]    │                        │
│  Home      │                          │   [Notes | AI | KCs]   │
│  Calendar  │   Selection -> Tooltip   │                        │
│  ...       │   - Ask AI               │   Chat with AI...      │
│            │   - Highlight            │                        │
│  Recent    │   - Copy                 │                        │
│            │                          │                        │
│  CONTENTS  │ <- Only in /reader/:id   │                        │
│  (teal)    │                          │                        │
│  - Ch 1    │                          │                        │
└────────────┴────────────────────────────────────────────────────┘
```

## Milestone Details

### M30: Core Infrastructure (2026-01-05)

**Database Migration (`migrations/m30_document_reader.sql`):**
- Extended `content_sources`: storage_path, original_filename, file_size_bytes, mime_type
- Created `reading_progress`: source_id, last_page, scroll_position, completion_percentage
- Created `annotations`: source_id, type, offsets, anchor_text, color, note_text
- Created `document_sections`: source_id, title, level, start_line, sequence_order
- Created "documents" bucket in Supabase Storage with RLS

**API Endpoints:**
- `GET /api/sources/{id}/file-url` - signed URL from Storage
- `GET /api/sources/{id}/sections` - document TOC

**Files Created:**
- `web/src/pages/DocumentReader.jsx` - main page shell
- Modified upload endpoint to store files in Storage

### M31: Sidebar TOC Integration (2026-01-05)

**Key Pattern:** TOC communicates via custom events (decoupled from component tree)

**Files Created:**
- `web/src/hooks/useDocumentSections.js` - fetches from `/api/sources/{id}/sections`
- `web/src/components/reader/TableOfContentsSection.jsx` - collapse/expand, hierarchy

**Modified:**
- `Sidebar.jsx` - route detection via `useLocation()`, conditional TOC render
- `DocumentReader.jsx` - listens for `scroll-to-section` events

TOC appears only on `/reader/:sourceId` route, uses teal accent color.

### M32: Document Rendering (2026-01-05)

**Dependencies:**
```bash
npm install react-pdf react-markdown remark-gfm rehype-highlight @tailwindcss/typography
```

**Files Created:**
- `web/src/components/reader/PDFRenderer.jsx` - react-pdf, page nav, zoom, scroll-to-page
- `web/src/components/reader/MarkdownRenderer.jsx` - GFM, syntax highlighting, scroll-to-heading
- `web/src/components/reader/TextRenderer.jsx` - plain text with line numbers
- `web/src/components/reader/ReaderContent.jsx` - selects renderer by content type

**API:**
- `GET /api/sources/{id}/content` - extracted text for markdown/text display

**Key Learning:** Check filename extension (more reliable than mime_type) for content type detection.

### M33: Navigation Entry Points (2026-01-05)

**Modified:**
- `SourceCard.jsx` - added "Read" button with BookOpen icon
- `SourceDetailPanel.jsx` - added "Read" button in footer
- `Sidebar.jsx` - recent sources link to `/reader/:id`
- `Sources.jsx` - redirect to reader after upload complete

### M34: Text Selection and Highlights (2026-01-05)

**Files Created:**
- `web/src/hooks/useTextSelection.js` - character offset calculation
- `web/src/components/reader/SelectionTooltip.jsx` - Ask AI, Highlight, Generate, Copy
- `web/src/hooks/useAnnotations.js` - Supabase CRUD, optimistic updates
- `web/src/components/reader/AnnotationLayer.jsx` - DOM text node wrapping for highlights

**Critical Discovery:** Supabase JS client requires legacy JWT-format anon key (starts with `eyJhbG...`), NOT `sb_publishable_` format. Get from Dashboard -> Settings -> API Keys -> "Legacy anon" tab.

### M35: Assistant Panel (2026-01-05)

**Files Created:**
- `web/src/components/reader/AssistantPanel.jsx` - Notes, AI, KCs tabs
- `web/src/components/reader/NotesList.jsx` - note management
- `web/src/components/reader/NoteEditor.jsx` - create/edit notes
- `web/src/components/reader/AIChatPanel.jsx` - message input, chat history
- `web/src/components/reader/KCsPanel.jsx` - extracted knowledge components

**API:**
- `POST /api/ai/chat` - Groq/Claude fallback for document Q&A

"Ask AI" from SelectionTooltip pre-fills chat with selected text.

### M36: Reading Progress (2026-01-05)

**Files Created:**
- `web/src/hooks/useReadingProgress.js` - debounced sync (500ms)

**Tracking:**
- scroll_position, current_page, total_pages, last_read_at
- Completion percentage calculated locally
- Progress indicator in header with percentage + bar
- Uses upsert to prevent duplicate records

Restores: scroll position for non-PDF, page number for PDF on return.

### M37: Polish and Performance (2026-01-05)

**Files Created:**
- `web/src/contexts/ZenModeContext.jsx` - distraction-free reading

**Features Implemented:**
- Zen mode toggle (Maximize2/Minimize2), ESC to exit
- React.memo on: PDFRenderer, MarkdownRenderer, TextRenderer, ReaderContent
- useMemo for expensive calculations (line splitting, plugin arrays)
- Deep linking with URL page parameter (?page=5)

**Deferred (lower priority for single-user desktop tool):**
- Responsive mobile layouts
- PDF virtualization for 100+ pages
- IndexedDB offline caching

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Reuse existing Sidebar with conditional TOC | Avoids redundant navigation, reuses patterns | 2026-01-05 |
| Store files in Supabase Storage not blob columns | CDN delivery, signed URLs, 50MB limit | 2026-01-05 |
| TOC via custom events | Decoupled components, no prop drilling | 2026-01-05 |
| Upsert for reading_progress | Prevents race condition duplicates | 2026-01-05 |
| Remove Highlight-to-Generate milestone | Contradicts VISION.md "no manual flashcards" | 2026-01-05 |
| Defer mobile/virtualization/caching | Lower priority for desktop tool | 2026-01-05 |
| docx-preview for DOCX rendering | Client-side, no server changes, 1-2 day implementation | 2026-01-06 |
| Page-based % coords for PDF highlights | Character offsets unstable for PDFs, survives zoom | 2026-01-06 |
| LibreOffice for PPTX→PDF | High fidelity, reuses PDFRenderer, no new bundle | 2026-01-06 |
| python-pptx for PPTX text extraction | Pure Python, extracts slides/tables/speaker notes | 2026-01-06 |

## Component Hierarchy

```
DocumentReader.jsx
├── ReaderHeader.jsx (title, zen toggle, practice button)
├── ReaderContent.jsx
│   ├── PDFRenderer.jsx (react-pdf) + PDFHighlightLayer.jsx
│   ├── MarkdownRenderer.jsx (react-markdown)
│   ├── TextRenderer.jsx (plain text)
│   ├── DOCXRenderer.jsx (docx-preview)
│   └── PPTX → routes to PDFRenderer (converted PDF)
├── SelectionTooltip.jsx (on text select)
├── AnnotationLayer.jsx (highlights overlay - Markdown/Text/DOCX)
└── AssistantPanel.jsx
    ├── NotesList.jsx / NoteEditor.jsx
    ├── AIChatPanel.jsx
    └── KCsPanel.jsx
```

## Hooks

| Hook | Purpose |
|------|---------|
| `useDocumentSections` | Fetch TOC from API |
| `useTextSelection` | Detect selection, calculate offsets |
| `useAnnotations` | CRUD for highlights/notes |
| `useReadingProgress` | Track/restore reading position |

## Database Tables Added

| Table | Purpose |
|-------|---------|
| `reading_progress` | Position, completion %, timestamps |
| `annotations` | Highlights, notes with offsets |
| `document_sections` | TOC structure |

Extended `content_sources` with:
- M30: storage_path, original_filename, file_size_bytes, mime_type
- M40: slide_count, converted_pdf_path

Extended `annotations` with (M39):
- position_type: 'character' or 'pdf_page'
- pdf_rects: JSONB array of {pageNumber, x, y, width, height} for PDF highlights

## M48: Persistent Zoom Preference (2026-01-18)

**Goal:** User's zoom level persists across sessions. Set zoom to 150%, close browser, come back - still 150%.

**Implementation:**

| Phase | Task | Files |
|-------|------|-------|
| 1 | Database migration | `migrations/m48_user_preferences.sql` - user_preferences table with RLS |
| 2 | useZoomPreference hook | `web/src/hooks/useZoomPreference.js` - load/save with 500ms debounce |
| 3 | Lift zoom state | `web/src/components/reader/ReaderContent.jsx` - calls hook, passes to renderers |
| 4 | Update renderers | `PDFRenderer.jsx`, `DOCXRenderer.jsx` - accept zoom/onZoomChange props |

**Database Schema:**
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_key)
);
-- RLS: Users can only access their own preferences
```

**Key Files:**
- `migrations/m48_user_preferences.sql` - Table with RLS
- `web/src/hooks/useZoomPreference.js` - Loads zoom on mount, debounced saves
- `web/src/components/reader/ReaderContent.jsx:76` - Calls useZoomPreference hook
- `web/src/components/reader/PDFRenderer.jsx:42-43` - Accepts zoom/onZoomChange props
- `web/src/components/reader/DOCXRenderer.jsx:29-30` - Same
- `web/src/contexts/SupabaseContext.jsx` - Added session tracking (Phase 5 fix)

**Phase 5 Bug Fix (Critical):**
- Issue: useZoomPreference hook expected `session` from useSupabase() but SupabaseContext didn't provide it
- Symptom: Zoom changes didn't save/load (userId was undefined, hook returned early)
- Fix: Added session state tracking to SupabaseContext:
  ```javascript
  const [session, setSession] = useState(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])
  // Add to context value: session
  ```

**Hooks Updated:**
| Hook | Change |
|------|--------|
| `useZoomPreference` | New - manages zoom state with DB persistence |

**Components Modified:**
| Component | Change |
|-----------|--------|
| `ReaderContent` | Calls useZoomPreference, passes zoom/onZoomChange to renderers |
| `PDFRenderer` | Removed local zoom useState, accepts props, handlers call onZoomChange |
| `DOCXRenderer` | Same as PDFRenderer |

**Database Tables Added:**
| Table | Purpose |
|-------|---------|
| `user_preferences` | Key-value store for per-user settings (zoom, future prefs) |
