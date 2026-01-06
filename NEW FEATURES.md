# AlphaXiv-Style Document Reader

**Consolidated Implementation Plan**
**Date:** 2026-01-05
**Target:** Document rendering with integrated TOC and AI assistant

---

## Executive Summary

This plan integrates an AlphaXiv-style document reader into the Personal Learning System. The reader enables users to:
1. Upload documents and **read them fully** before practice
2. Access documents persistently via Sources (one click away)
3. Take notes, highlight text, and ask AI questions while reading
4. Generate practice questions from highlighted text

**Core Flow:** Upload → Read/Study → Practice (source always accessible)

---

## Architecture Overview

### Two-Panel Layout (Adapted to Existing UI)

The document reader reuses the **existing Sidebar** and adds a conditional **Table of Contents** section that only appears when viewing a document. The right panel contains the AI Assistant.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Back   📖 Document Title   [PDF|Blog]   [Zen Mode]   [Start Practice]│
├──────────────┬──────────────────────────────────────────────────────────┤
│              │                                                          │
│  SIDEBAR     │           DOCUMENT + ASSISTANT                           │
│  (existing)  │           (flexible layout)                              │
│              │  ┌─────────────────────────────┬────────────────────┐    │
│  Home        │  │                             │                    │    │
│  Calendar    │  │  Document Content           │  ASSISTANT PANEL   │    │
│  Due Review  │  │  - PDF (react-pdf)          │  (320px, toggle)   │    │
│  Sources     │  │  - Markdown                 │                    │    │
│  Progress    │  │  - Plain text               │  [Notes|AI|KCs]    │    │
│  Analytics   │  │                             │                    │    │
│              │  │  [Text selection → tooltip] │  AI Assistant      │    │
│  Recent      │  │  - Ask AI                   │  ────────────      │    │
│  📚 Source 1 │  │  - Highlight                │  "Explain this     │    │
│  🧠 Source 2 │  │  - Copy                     │   concept..."      │    │
│              │  │                             │                    │    │
│  ▼ CONTENTS  │  │                             │  [Chat Input]      │    │
│  (teal/cyan) │  └─────────────────────────────┴────────────────────┘    │
│  • Chapter 1 │                                                          │
│    - 1.1     ├──────────────────────────────────────────────────────────┤
│    - 1.2     │  Progress: 45% read │ 12 concepts │ 28% mastery          │
│  • Chapter 2 │                                                          │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### Sidebar Behavior by Route

| Route | Sidebar Shows |
|-------|---------------|
| `/` `/calendar` `/review` `/sources` `/progress` `/analytics` | Nav + Recent |
| `/reader/:sourceId` | Nav + Recent + **TABLE OF CONTENTS** (accent color) |
| `/study` | Sidebar hidden (existing fullscreen behavior) |

### Route Structure

```
/                       → Home (existing)
/sources                → Sources list (existing)
/study                  → Practice session (existing)
/reader/:sourceId       → Document Reader (NEW)
/reader/:sourceId/section/:sectionId   → Deep link to section
```

### Component Tree

```
App
├── BrowserRouter
│   ├── Route (/) [Layout]                    # Existing
│   │   └── Outlet → Home, Sources, etc.
│   │
│   └── Route (/reader/:sourceId) [Layout]    # Reuses existing Layout
│       └── DocumentReaderPage
│           ├── ReaderHeader (title, tabs, controls)
│           ├── ReaderContent (document area)
│           │   ├── PDFRenderer | MarkdownRenderer | TextRenderer
│           │   ├── SelectionTooltip
│           │   └── AnnotationLayer
│           └── AssistantPanel (right, collapsible)
│               ├── TabBar (Notes | AI | KCs)
│               ├── NotesList / NoteEditor
│               └── AIChatPanel

Sidebar (modified)
├── Nav items (existing)
├── Recent sources (existing)
└── TableOfContents (NEW - conditional)
    └── Only renders when route matches /reader/:sourceId
    └── Fetches sections for current sourceId
    └── Accent color (teal/cyan) to differentiate
    └── Collapsible with chevron toggle
```

---

## Database Schema

### New Tables

```sql
-- Run in Supabase SQL Editor

-- 1. Extend content_sources for file storage
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- 2. Reading progress tracking
CREATE TABLE IF NOT EXISTS reading_progress (
    id TEXT PRIMARY KEY DEFAULT ('rp_' || substr(md5(random()::text), 1, 12)),
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    last_page INTEGER,
    last_scroll_position REAL,  -- 0.0-1.0 percentage
    total_pages INTEGER,
    pages_viewed TEXT,          -- JSON array: [1, 2, 5, 6, ...]
    completion_percentage REAL DEFAULT 0.0,
    first_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_reading_time_seconds INTEGER DEFAULT 0,
    UNIQUE(source_id)
);

CREATE INDEX idx_reading_progress_source ON reading_progress(source_id);

-- 3. Annotations (highlights, notes, bookmarks)
CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY DEFAULT ('ann_' || substr(md5(random()::text), 1, 12)),
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    annotation_type TEXT NOT NULL DEFAULT 'highlight',  -- highlight, note, bookmark
    start_offset INTEGER NOT NULL,
    end_offset INTEGER NOT NULL,
    anchor_text TEXT,           -- The highlighted text (for validation)
    page_number INTEGER,        -- For PDFs
    note_text TEXT,             -- User's note (null for pure highlights)
    color TEXT DEFAULT '#FFEB3B',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_kc_id TEXT REFERENCES knowledge_components(id) ON DELETE SET NULL
);

CREATE INDEX idx_annotations_source ON annotations(source_id);
CREATE INDEX idx_annotations_type ON annotations(annotation_type);
CREATE INDEX idx_annotations_page ON annotations(page_number);

-- 4. Document sections (for TOC)
CREATE TABLE IF NOT EXISTS document_sections (
    id TEXT PRIMARY KEY DEFAULT ('sec_' || substr(md5(random()::text), 1, 12)),
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,  -- 1=h1, 2=h2, etc.
    start_line INTEGER NOT NULL,
    end_line INTEGER,
    parent_section_id TEXT REFERENCES document_sections(id),
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_source ON document_sections(source_id);

-- 5. AI chat history (optional, for context persistence)
CREATE TABLE IF NOT EXISTS ai_chat_history (
    id TEXT PRIMARY KEY DEFAULT ('chat_' || substr(md5(random()::text), 1, 12)),
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    role TEXT NOT NULL,  -- 'user' or 'assistant'
    message TEXT NOT NULL,
    citations TEXT,      -- JSON array of citation objects
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_source ON ai_chat_history(source_id);

-- 6. Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE reading_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE annotations;

-- 7. Helper function for reading time
CREATE OR REPLACE FUNCTION increment_reading_time(p_source_id TEXT, p_delta INTEGER)
RETURNS INTEGER AS $$
DECLARE
    new_total INTEGER;
BEGIN
    UPDATE reading_progress
    SET total_reading_time_seconds = total_reading_time_seconds + p_delta
    WHERE source_id = p_source_id
    RETURNING total_reading_time_seconds INTO new_total;
    RETURN COALESCE(new_total, p_delta);
END;
$$ LANGUAGE plpgsql;
```

### Supabase Storage Bucket

```sql
-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/markdown', 'text/plain']
);

-- Storage policy
CREATE POLICY "Allow all operations on documents bucket"
ON storage.objects FOR ALL
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
```

---

## API Endpoints

### New FastAPI Routes

| Method | Path | Purpose |
|--------|------|---------|
| **File Access** | | |
| GET | `/api/sources/{id}/file-url` | Get signed URL for document |
| GET | `/api/sources/{id}/content` | Get rendered HTML content |
| GET | `/api/sources/{id}/sections` | Get document TOC |
| **Reading Progress** | | |
| GET | `/api/sources/{id}/progress` | Get reading progress |
| PUT | `/api/sources/{id}/progress` | Update reading progress |
| **Annotations** | | |
| GET | `/api/sources/{id}/annotations` | List all annotations |
| POST | `/api/sources/{id}/annotations` | Create annotation |
| PUT | `/api/annotations/{id}` | Update annotation |
| DELETE | `/api/annotations/{id}` | Delete annotation |
| **AI Assistant** | | |
| POST | `/api/ai/chat` | Send chat message |
| GET | `/api/sources/{id}/chat-history` | Get chat history |
| **Practice Generation** | | |
| POST | `/api/items/generate-from-text` | Generate question from highlight |

### Pydantic Models

```python
# app/api/models/reader_schemas.py

class ReadingProgressUpdate(BaseModel):
    last_page: Optional[int] = None
    last_scroll_position: Optional[float] = None
    pages_viewed: Optional[List[int]] = None
    reading_time_delta: Optional[int] = None

class AnnotationCreate(BaseModel):
    annotation_type: str  # highlight, note, bookmark
    start_offset: int
    end_offset: int
    anchor_text: Optional[str] = None
    page_number: Optional[int] = None
    note_text: Optional[str] = None
    color: Optional[str] = "#FFEB3B"
    linked_kc_id: Optional[str] = None

class AIChatRequest(BaseModel):
    source_id: str
    message: str
    context: Optional[str] = None  # Current selection for grounding

class GenerateFromTextRequest(BaseModel):
    source_id: str
    selected_text: str
    question_type: str = "explanation"  # definition, explanation, application
```

---

## User Flow & Navigation

### Entry Points to Document Reader

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOW USERS GET TO /reader/:sourceId                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SOURCES PAGE (/sources)                                                  │
│     └── SourceCard component                                                 │
│         └── "Read" button → navigate(`/reader/${source.id}`)                │
│                                                                              │
│  2. SOURCE DETAIL PANEL (slide-in on /sources)                              │
│     └── "Read Document" button → navigate(`/reader/${source.id}`)           │
│                                                                              │
│  3. HOME PAGE (/)                                                            │
│     └── SourceCard in "Continue Learning" section                           │
│         └── "Read" action → navigate(`/reader/${source.id}`)                │
│                                                                              │
│  4. SIDEBAR - RECENT SOURCES                                                 │
│     └── Click recent source → navigate(`/reader/${source.id}`)              │
│         (change from current /sources/${id} behavior)                        │
│                                                                              │
│  5. POST-UPLOAD REDIRECT                                                     │
│     └── After successful upload → navigate(`/reader/${newSourceId}`)        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Exit Points from Document Reader

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOW USERS LEAVE /reader/:sourceId                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. SIDEBAR NAVIGATION                                                       │
│     └── Click any nav item (Home, Sources, etc.)                            │
│         └── TOC section disappears, normal sidebar view                     │
│                                                                              │
│  2. "START PRACTICE" BUTTON (in ReaderHeader)                               │
│     └── navigate(`/study?source=${sourceId}`)                               │
│         └── Practice session scoped to this document                        │
│                                                                              │
│  3. BACK BUTTON (in ReaderHeader)                                           │
│     └── navigate(-1) or navigate('/sources')                                │
│                                                                              │
│  4. TOC CLICK → SECTION (stays in reader, scrolls document)                 │
│     └── NOT an exit, but important interaction                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sidebar State Detection

```javascript
// In Sidebar.jsx - detect if we're in reader view
import { useLocation, useParams } from 'react-router-dom'

function Sidebar() {
  const location = useLocation()
  const isReaderView = location.pathname.startsWith('/reader/')

  // Extract sourceId from path if in reader view
  const sourceIdMatch = location.pathname.match(/\/reader\/([^/]+)/)
  const readerSourceId = sourceIdMatch ? sourceIdMatch[1] : null

  return (
    <aside>
      {/* ... existing nav items ... */}
      {/* ... existing Recent section ... */}

      {/* NEW: Table of Contents - only in reader view */}
      {isReaderView && readerSourceId && (
        <TableOfContentsSection
          sourceId={readerSourceId}
          collapsed={collapsed}
        />
      )}
    </aside>
  )
}
```

---

## React Components

### New Files Structure

```
web/src/
├── pages/
│   └── DocumentReader.jsx           # Main reader page
├── components/
│   ├── layout/
│   │   └── Sidebar.jsx              # MODIFY - add conditional TOC
│   └── reader/
│       ├── ReaderHeader.jsx         # Title, tabs, zen toggle, practice btn
│       ├── ReaderContent.jsx        # Document area container
│       ├── PDFRenderer.jsx          # react-pdf wrapper
│       ├── MarkdownRenderer.jsx     # react-markdown wrapper
│       ├── TextRenderer.jsx         # Plain text display
│       ├── SelectionTooltip.jsx     # Ask AI / Highlight / Copy
│       ├── AnnotationLayer.jsx      # Highlights overlay
│       ├── TableOfContentsSection.jsx  # NEW - sidebar TOC component
│       ├── AssistantPanel.jsx       # Right panel container
│       ├── NotesList.jsx            # User notes list
│       ├── NoteEditor.jsx           # Note create/edit form
│       ├── AIChatPanel.jsx          # AI chat interface
│       └── GenerateQuestionModal.jsx # Highlight-to-generate
├── hooks/
│   ├── useDocumentLoader.js         # Document fetching + signed URLs
│   ├── useDocumentSections.js       # Fetch TOC sections for sidebar
│   ├── useReadingProgress.js        # Progress tracking
│   ├── useAnnotations.js            # Annotations CRUD
│   ├── useDocumentCache.js          # IndexedDB caching
│   ├── useTextSelection.js          # Selection detection
│   └── useDeepLink.js               # URL deep linking
├── contexts/
│   └── DocumentViewerContext.jsx    # Reader state management
└── services/
    ├── readerApi.js                 # Document content API
    ├── notesApi.js                  # Notes CRUD
    └── aiChatApi.js                 # AI chat API
```

### TableOfContentsSection Component (Sidebar Integration)

This component is rendered **inside the existing Sidebar** when `isReaderView` is true.

```jsx
// web/src/components/reader/TableOfContentsSection.jsx

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, List } from 'lucide-react'
import { useDocumentSections } from '../../hooks/useDocumentSections'

export default function TableOfContentsSection({ sourceId, collapsed: sidebarCollapsed }) {
  const [expanded, setExpanded] = useState(true)
  const { sections, loading } = useDocumentSections(sourceId)

  // Don't render if sidebar is collapsed
  if (sidebarCollapsed) return null

  return (
    <div className="mt-6 border-t border-bg-card-border pt-4">
      {/* Header - accent color (teal/cyan) */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 w-full text-left group"
      >
        {expanded ? (
          <ChevronDown size={14} className="text-accent-progress" />
        ) : (
          <ChevronRight size={14} className="text-accent-progress" />
        )}
        <List size={16} className="text-accent-progress" />
        <span className="text-xs font-medium text-accent-progress uppercase tracking-wider">
          Contents
        </span>
      </button>

      {/* TOC Items */}
      {expanded && !loading && (
        <ul className="mt-2 space-y-0.5 max-h-64 overflow-y-auto">
          {sections.map(section => (
            <li key={section.id}>
              <button
                onClick={() => scrollToSection(section.id)}
                className={`
                  w-full text-left px-3 py-1.5 text-sm rounded-md
                  text-text-secondary hover:text-accent-progress hover:bg-btn-secondary/50
                  transition-colors truncate
                  ${section.level === 1 ? 'font-medium' : 'pl-6 text-xs'}
                `}
                title={section.title}
              >
                {section.title}
              </button>
            </li>
          ))}
        </ul>
      )}

      {expanded && loading && (
        <div className="px-3 py-2 text-xs text-text-muted">Loading...</div>
      )}
    </div>
  )
}

// Scroll handler - communicates with DocumentReader via context or custom event
function scrollToSection(sectionId) {
  // Option 1: Custom event
  window.dispatchEvent(new CustomEvent('scroll-to-section', { detail: { sectionId } }))

  // Option 2: Update URL (deep link)
  // window.history.pushState(null, '', `/reader/${sourceId}/section/${sectionId}`)
}
```

**Styling Notes:**
- Header uses `text-accent-progress` (teal/cyan) to differentiate from nav items
- Max height with overflow for long TOCs
- Indentation for nested headings (h2, h3)
- Hover state matches accent color

### Key Component Props

```typescript
// Type definitions

interface ReaderHeaderProps {
  source: Source
  viewMode: 'pdf' | 'blog'
  onViewModeChange: (mode: 'pdf' | 'blog') => void
  zenMode: boolean
  onToggleZen: () => void
}

interface ReaderContentProps {
  source: Source
  viewMode: 'pdf' | 'blog'
  onTextSelect: (selection: TextSelection | null) => void
}

interface TextSelection {
  text: string
  startOffset: number
  endOffset: number
  pageNumber?: number
  position: { top: number, left: number, width: number, height: number }
}

interface AssistantPanelProps {
  sourceId: string
  selection?: TextSelection | null
  onGenerateQuestion: (text: string) => void
}
```

---

## Dependencies

### npm Packages (Frontend)

```bash
cd web && npm install \
  react-pdf \
  pdfjs-dist \
  react-markdown \
  remark-gfm \
  rehype-highlight \
  highlight.js \
  @tanstack/react-virtual \
  idb
```

| Package | Version | Purpose |
|---------|---------|---------|
| `react-pdf` | ^9.0.0 | PDF rendering with text layer |
| `pdfjs-dist` | ^4.0.0 | PDF.js core (peer dep) |
| `react-markdown` | ^9.0.0 | Markdown rendering |
| `remark-gfm` | ^4.0.0 | GitHub Flavored Markdown |
| `rehype-highlight` | ^7.0.0 | Syntax highlighting |
| `highlight.js` | ^11.0.0 | Highlighting engine |
| `@tanstack/react-virtual` | ^3.0.0 | PDF page virtualization |
| `idb` | ^8.0.0 | IndexedDB wrapper for caching |

### pip Packages (Backend)

```bash
pip install mammoth
```

| Package | Purpose |
|---------|---------|
| `mammoth` | DOCX to HTML conversion |

---

## Tailwind Config Additions

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        'sidebar': '240px',
        'sidebar-collapsed': '64px',
        'assistant': '320px',
        'assistant-min': '280px',
        'assistant-max': '480px',
      },
      screens: {
        'reader': '1280px',  // Three-column minimum
      }
    }
  }
}
```

---

## Responsive Breakpoints

| Breakpoint | Layout | Behavior |
|------------|--------|----------|
| >= 1280px | Full layout | Sidebar (with TOC) + Document + Assistant panel |
| 1024-1279px | Compact | Sidebar collapsed + Document + Assistant panel |
| 768-1023px | Tablet | No sidebar, Document + Assistant as drawer |
| < 768px | Mobile | Full-width document, Assistant as bottom sheet, TOC hidden |

**Note:** The TOC section in the sidebar follows the sidebar's collapse state. When sidebar is collapsed, TOC is hidden. On mobile, users access document sections via a floating TOC button or in-document navigation.

---

## Implementation Phases

### Phase 1: Core Infrastructure (M-R1)
**Goal:** Database ready, file storage working, basic reader route

- [ ] Run database migration (new tables + columns)
- [ ] Create Supabase Storage bucket "documents"
- [ ] Modify upload endpoint to store files in Storage
- [ ] Add `/api/sources/{id}/file-url` endpoint
- [ ] Add `/api/sources/{id}/sections` endpoint (for TOC)
- [ ] Add `/reader/:sourceId` route to App.jsx (uses existing Layout)
- [ ] Create basic `DocumentReader.jsx` page shell

### Phase 2: Sidebar TOC Integration (M-R2)
**Goal:** Table of Contents appears in sidebar when viewing documents

- [ ] Create `TableOfContentsSection.jsx` component
- [ ] Create `useDocumentSections.js` hook
- [ ] Modify `Sidebar.jsx` to detect `/reader/:sourceId` route
- [ ] Conditionally render TOC section with accent color (teal)
- [ ] Implement collapse/expand toggle
- [ ] Wire TOC clicks to scroll document via custom event

### Phase 3: Document Rendering (M-R3)
**Goal:** PDF and text documents render correctly

- [ ] Install PDF dependencies (react-pdf, pdfjs-dist)
- [ ] Create `PDFRenderer.jsx` with text layer
- [ ] Create `MarkdownRenderer.jsx` with syntax highlighting
- [ ] Create `TextRenderer.jsx` for plain text
- [ ] Create `ReaderHeader.jsx` with view mode tabs + Start Practice button
- [ ] Implement PDF page navigation and zoom controls
- [ ] Listen for `scroll-to-section` events from TOC

### Phase 4: Navigation Entry Points (M-R4)
**Goal:** Users can access reader from multiple locations

- [ ] Add "Read" button to SourceCard component
- [ ] Add "Read Document" button to SourceDetailPanel
- [ ] Update Sidebar recent sources to link to `/reader/:id`
- [ ] Modify upload flow to redirect to `/reader/:id` after success
- [ ] Add "Start Practice" button → `/study?source=${id}`

### Phase 5: Text Selection & Highlights (M-R5)
**Goal:** Users can select text, create highlights

- [ ] Create `SelectionTooltip.jsx` component
- [ ] Implement `useTextSelection.js` hook
- [ ] Create `useAnnotations.js` hook with Supabase sync
- [ ] Add annotations API endpoints
- [ ] Create `AnnotationLayer.jsx` for rendering highlights
- [ ] Implement optimistic updates for annotations

### Phase 6: Assistant Panel (M-R6)
**Goal:** Right-side panel for notes and AI chat

- [ ] Create `AssistantPanel.jsx` with tabs (Notes | AI | KCs)
- [ ] Create `NotesList.jsx` and `NoteEditor.jsx`
- [ ] Add notes API endpoints
- [ ] Create `AIChatPanel.jsx` component
- [ ] Add `/api/ai/chat` endpoint with Claude integration
- [ ] Add "Ask AI" action to selection tooltip

### Phase 7: Reading Progress (M-R7)
**Goal:** Track and persist reading position

- [ ] Create `useReadingProgress.js` hook
- [ ] Add progress API endpoints
- [ ] Implement debounced sync to database
- [ ] Restore position on document reopen
- [ ] Show completion percentage in ReaderHeader

### Phase 8: Highlight-to-Generate (M-R8)
**Goal:** Generate practice questions from selected text

- [ ] Create `GenerateQuestionModal.jsx`
- [ ] Add `/api/items/generate-from-text` endpoint
- [ ] Modify KC extraction to populate source_excerpt
- [ ] Link generated items to source location
- [ ] Add "Generate Question" action to SelectionTooltip

### Phase 9: Polish & Performance (M-R9)
**Goal:** Production-ready experience

- [ ] Implement IndexedDB caching for offline support
- [ ] Add PDF page virtualization for large documents
- [ ] Create Zen mode (hide assistant panel)
- [ ] Add responsive mobile layouts
- [ ] Performance optimization (lazy loading, memoization)
- [ ] Deep linking with URL updates on section scroll

---

## Upload Flow Changes

### Current Flow
```
Upload → Extract text → Store in content column → Delete file
```

### New Flow
```
Upload → Store file in Supabase Storage → Extract text → Store path in storage_path
                                                       ↓
                                        Redirect to /reader/:sourceId
```

### Modified Upload Endpoint

```python
@router.post("/upload")
async def upload_source(file: UploadFile, background_tasks: BackgroundTasks):
    # 1. Create pending source to get ID
    source_id = create_pending_source(file.filename)

    # 2. Upload to Supabase Storage
    storage_path = await upload_to_storage(source_id, file.filename, content)

    # 3. Update source with storage path
    update_source_storage_path(source_id, storage_path)

    # 4. Start background processing
    background_tasks.add_task(process_document, source_id, temp_path)

    # 5. Return immediately - user can start reading
    return {"source_id": source_id, "status": "pending"}
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File storage | Supabase Storage | CDN, signed URLs, separate from DB |
| PDF rendering | react-pdf | Lightweight, text layer support |
| Layout | Existing Sidebar + Document area | Reuses existing UI, no redundant panels |
| TOC location | Inside Sidebar (conditional) | Appears only on `/reader/:id`, consistent nav |
| TOC styling | Accent color (teal) | Differentiates from nav items, draws attention |
| State management | Context + hooks | Local state, no Redux needed |
| Annotation anchoring | Text offsets | Survives zoom, reflow, edits |
| Caching | IndexedDB | Offline support, large files |
| Route structure | `/reader/:sourceId` | Clean URLs, uses existing Layout wrapper |
| TOC→Document communication | Custom events | Decoupled, works across component tree |

---

## Success Criteria

1. **Upload → Read:** User can read uploaded document within 2 seconds
2. **Source Accessibility:** Document is one click away from any practice question
3. **Text Selection:** Users can highlight and ask AI about any text
4. **Progress Persistence:** Reading position restored on return
5. **Mobile Support:** Full functionality on tablet, graceful degradation on mobile
6. **Performance:** Large PDFs (100+ pages) load progressively without freezing

---

## Cross-References

- **Memory Files:**
  - `milestones/sources_feature.md` - Current upload implementation
  - `schemas/database.md` - Existing schema
  - `schemas/api.md` - Existing API patterns
  - `schemas/components.md` - React component structure

- **Research Worktrees:**
  - `research-ui-layout` - Three-panel layout details
  - `research-document-rendering` - PDF/Markdown rendering
  - `research-data-model` - State management, caching
  - `research-upload-pipeline` - Storage integration
  - `research-practice-flow` - Question generation
  - `research-integration` - Navigation, deep linking
