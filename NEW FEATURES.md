# Document Viewer Fidelity Improvement

**Consolidated Implementation Plan**
**Date:** 2026-01-06
**Target:** Render uploaded documents with full visual fidelity (AlphaXiv-style)

---

## Executive Summary

The current document viewer renders DOCX files as plain text, losing all formatting (headings, tables, images, colors, fonts). This plan consolidates research from 6 parallel worktrees to deliver a production-ready solution.

**The Problem:**
- DOCX files → extracted as plain text via `python-docx` → displayed with line numbers
- Users see: "Chapter 1" instead of "**Chapter 1**" with proper heading styling
- Lost: headings, bold/italic, colors, tables, images, lists, alignment

**The Solution:**
- **Primary:** Client-side DOCX rendering with `docx-preview` library
- **Alternative:** Server-side DOCX→PDF conversion with LibreOffice (higher fidelity, more complex)

**Implementation Timeline:** 4-6 days for core functionality

---

## Research Summary (6 Worktrees)

| Worktree | Key Finding |
|----------|-------------|
| **UI/UX** | docx-preview recommended; most AlphaXiv patterns already implemented |
| **Data Model** | Need `document_versions` table + dual annotation schema (offset + page_rect) |
| **Upload Pipeline** | LibreOffice + unoserver for server-side PDF conversion (alternative approach) |
| **Rendering Engine** | docx-preview best for client-side; mammoth.js insufficient fidelity |
| **Format Handling** | DOCX highest priority; PDF virtualization for large docs; add math to Markdown |
| **Integration** | KC extraction unaffected; annotations need dual-schema; backward compatible |

---

## Architecture Decision

### Recommended: Client-Side docx-preview

**Why:**
1. No server infrastructure changes required
2. 1-2 day implementation vs 3-5 days for server PDF
3. Native HTML output enables text selection and existing AnnotationLayer
4. 168 projects use it in production
5. ~1.7MB bundle addition (acceptable for document viewer)

**Trade-offs:**
- No page breaks (continuous scroll vs paginated PDF)
- Font substitution if system fonts differ from document fonts
- Complex tables may render imperfectly

### Alternative: Server-Side PDF Conversion

Use if client-side fidelity is insufficient:

```
Upload DOCX → LibreOffice headless → PDF → Supabase Storage → PDFRenderer
```

**When to consider:**
- Academic papers requiring page break fidelity
- Complex documents with precise layouts
- Already running LibreOffice in infrastructure

---

## Implementation Plan

### Phase 1: DOCX Client-Side Rendering (Priority: P0)

**Time:** 1-2 days | **Impact:** High | **Risk:** Low

#### 1.1 Install Dependencies

```bash
cd web && npm install docx-preview
# JSZip is a peer dependency, installed automatically
```

#### 1.2 Create DOCXRenderer Component

**File:** `web/src/components/reader/DOCXRenderer.jsx`

```jsx
import { useState, useEffect, useRef, memo } from 'react'
import { renderAsync } from 'docx-preview'
import { Loader2 } from 'lucide-react'

const DOCXRenderer = memo(function DOCXRenderer({
  fileUrl,
  highlights = [],
  onDeleteHighlight
}) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!fileUrl) {
      setError('No document URL provided')
      setLoading(false)
      return
    }

    async function render() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(fileUrl)
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`)

        const arrayBuffer = await response.arrayBuffer()

        await renderAsync(arrayBuffer, containerRef.current, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: false,
          useBase64URL: true,
          className: 'docx-wrapper'
        })

        setLoading(false)
      } catch (err) {
        console.error('DOCX render error:', err)
        setError('Failed to render document')
        setLoading(false)
      }
    }

    render()
  }, [fileUrl])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Rendering document...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-white">
      <div
        ref={containerRef}
        className="docx-container mx-auto max-w-4xl p-8"
      />
    </div>
  )
})

export default DOCXRenderer
```

#### 1.3 Add DOCX Styles

**File:** `web/src/styles/docx.css`

```css
/* Scope docx-preview styles */
.docx-container {
  font-family: 'Calibri', 'Arial', sans-serif;
}

.docx-container .docx-wrapper {
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 2rem;
  border-radius: 4px;
}

/* Ensure tables are visible */
.docx-container table {
  border-collapse: collapse;
  width: 100%;
}

.docx-container td, .docx-container th {
  border: 1px solid #ddd;
  padding: 8px;
}

/* Images responsive */
.docx-container img {
  max-width: 100%;
  height: auto;
}
```

#### 1.4 Update ReaderContent.jsx

**File:** `web/src/components/reader/ReaderContent.jsx`

```diff
+ import DOCXRenderer from './DOCXRenderer'

function getContentType(mimeType, title) {
  if (title) {
    const ext = title.toLowerCase().split('.').pop()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'md' || ext === 'markdown') return 'markdown'
    if (ext === 'txt') return 'text'
-   if (ext === 'docx' || ext === 'doc') return 'text'
+   if (ext === 'docx' || ext === 'doc') return 'docx'
  }
  // ... rest unchanged
}

// In renderContent() switch:
+ case 'docx':
+   if (!fileUrl) {
+     return (
+       <FallbackView
+         message="Document file not available"
+         hint="The original file may have been uploaded before file storage was enabled."
+       />
+     )
+   }
+   return (
+     <DOCXRenderer
+       fileUrl={fileUrl}
+       highlights={highlights}
+       onDeleteHighlight={onDeleteHighlight}
+     />
+   )
```

#### 1.5 Verification

- [ ] Upload a DOCX file with headings, tables, images
- [ ] Navigate to `/reader/:sourceId`
- [ ] Verify headings are styled correctly
- [ ] Verify tables are rendered with borders
- [ ] Verify images are displayed
- [ ] Verify text selection works

---

### Phase 2: Annotation System Updates (Priority: P1)

**Time:** 2-3 days | **Impact:** Medium | **Risk:** Medium

#### 2.1 Database Schema Changes

**File:** `migrations/m38_document_versions.sql`

```sql
-- M38: Document Viewer Fidelity - Schema Updates
-- Run in Supabase SQL Editor

-- 1. Create document_versions table for converted formats
CREATE TABLE IF NOT EXISTS document_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    version_type TEXT NOT NULL,  -- 'html', 'thumbnail', 'pdf'
    format TEXT NOT NULL,        -- MIME type
    storage_path TEXT,           -- Path in Supabase Storage (NULL if inline)
    inline_content TEXT,         -- For small content stored in DB
    file_size_bytes BIGINT,
    converter_name TEXT,         -- 'docx-preview', 'mammoth', 'libreoffice'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, version_type)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_source ON document_versions(source_id);

-- 2. Extend annotations for multi-format positioning
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS position_type TEXT DEFAULT 'offset';
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS pdf_rect JSONB;
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS html_xpath TEXT;

-- 3. Extend content_sources for conversion tracking
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS has_html_version BOOLEAN DEFAULT FALSE;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS page_count INTEGER;

-- 4. Migrate existing annotations
UPDATE annotations
SET position_type = 'offset'
WHERE position_type IS NULL;

-- 5. Create thumbnails bucket (public for fast loading)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE document_versions;
```

#### 2.2 Update useAnnotations Hook

Support dual positioning (offset for text, page_rect for PDF):

```javascript
// In useAnnotations.js - createAnnotation function
function createAnnotation(selection, contentType) {
  const annotation = {
    source_id: sourceId,
    annotation_type: 'highlight',
    selected_text: selection.text.substring(0, 500),
    start_offset: selection.startOffset,
    end_offset: selection.endOffset,
    position_type: 'offset', // Default
  }

  // For PDF, add page-based coordinates
  if (contentType === 'pdf' && selection.pageRect) {
    annotation.position_type = 'page_rect'
    annotation.page_number = selection.pageNumber
    annotation.pdf_rect = selection.pageRect
  }

  return annotation
}
```

---

### Phase 3: UI Polish (Priority: P2)

**Time:** 1-2 days | **Impact:** Medium | **Risk:** Low

#### 3.1 Unified Document Toolbar

Extract toolbar from PDFRenderer into shared component:

```jsx
// web/src/components/reader/DocumentToolbar.jsx
export default function DocumentToolbar({
  title,
  hasZoom,
  hasPages,
  currentPage,
  totalPages,
  zoom,
  onZoomChange,
  onPageChange,
  onZenModeToggle,
  zenMode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-medium truncate max-w-md">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {hasZoom && (
          <div className="flex items-center gap-2">
            <button onClick={() => onZoomChange(zoom - 0.25)}>-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => onZoomChange(zoom + 0.25)}>+</button>
          </div>
        )}

        {hasPages && (
          <div className="flex items-center gap-2">
            <button onClick={() => onPageChange(currentPage - 1)}>←</button>
            <span>{currentPage} / {totalPages}</span>
            <button onClick={() => onPageChange(currentPage + 1)}>→</button>
          </div>
        )}

        <button onClick={onZenModeToggle}>
          {zenMode ? 'Exit Zen' : 'Zen Mode'}
        </button>
      </div>
    </div>
  )
}
```

#### 3.2 View Mode Toggle

Add ability to switch between rendered view and text view:

```jsx
// In DocumentReader.jsx
const [viewMode, setViewMode] = useState('rendered') // 'rendered' | 'text'

{viewMode === 'rendered' ? (
  <DOCXRenderer fileUrl={fileUrl} />
) : (
  <TextRenderer content={extractedContent} />
)}
```

---

### Phase 4: Server-Side PDF Conversion (Optional, P3)

**Time:** 3-5 days | **Impact:** High | **Risk:** High

Only implement if client-side docx-preview fidelity is insufficient.

#### 4.1 Install LibreOffice + unoserver

```dockerfile
# Add to Dockerfile
RUN apt-get update && apt-get install -y \
    libreoffice \
    fonts-liberation \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

RUN pip install unoserver
```

#### 4.2 Converter Module

**File:** `learn_system/app/ingestion/converter.py`

```python
"""Document conversion utilities using LibreOffice."""

import subprocess
import tempfile
from pathlib import Path
from typing import Optional

class ConversionError(Exception):
    pass

def convert_docx_to_pdf(docx_path: str, output_dir: Optional[str] = None) -> str:
    """Convert DOCX to PDF using LibreOffice headless."""
    input_path = Path(docx_path)
    output_dir = output_dir or input_path.parent
    output_path = Path(output_dir) / f"{input_path.stem}.pdf"

    try:
        subprocess.run([
            'soffice', '--headless', '--convert-to', 'pdf',
            '--outdir', str(output_dir), str(input_path)
        ], check=True, timeout=60)

        return str(output_path)
    except subprocess.CalledProcessError as e:
        raise ConversionError(f"LibreOffice conversion failed: {e}")
    except subprocess.TimeoutExpired:
        raise ConversionError("Conversion timed out")
```

#### 4.3 Modify Upload Pipeline

```python
# In sources.py upload endpoint
if ext == '.docx':
    try:
        pdf_path = convert_docx_to_pdf(temp_path)
        storage_path_pdf = upload_to_storage(source_id, pdf_content, f"{source_id}.pdf")
        # Update DB with storage_path_pdf
    except ConversionError as e:
        # Continue without PDF - reader will use docx-preview
        logger.warning(f"DOCX conversion failed: {e}")
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `web/src/components/reader/DOCXRenderer.jsx` | Client-side DOCX rendering |
| `web/src/styles/docx.css` | DOCX-specific styles |
| `migrations/m38_document_versions.sql` | Schema updates |
| `learn_system/app/ingestion/converter.py` | Server-side conversion (optional) |

### Modified Files

| File | Change |
|------|--------|
| `web/src/components/reader/ReaderContent.jsx` | Add 'docx' content type routing |
| `web/src/hooks/useAnnotations.js` | Support dual position types |
| `web/package.json` | Add docx-preview dependency |

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| DOCX heading visibility | 0% | 100% |
| DOCX formatting preservation | ~10% | ~85% |
| DOCX table rendering | Text only | Full structure |
| DOCX image display | None | Embedded images visible |
| Bundle size increase | - | < 2MB |

---

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| docx-preview fidelity insufficient | Low | High | Fall back to server PDF conversion |
| Large DOCX performance | Medium | Medium | Add loading skeleton, chunked rendering |
| Annotation system breaks | Low | High | Keep offset-based as fallback |
| Font substitution issues | Medium | Low | Document known font issues |

---

## Testing Checklist

### Phase 1 Verification
- [ ] DOCX with headings (H1, H2, H3) renders correctly
- [ ] DOCX with bold, italic, underline visible
- [ ] DOCX tables render with borders
- [ ] DOCX images display inline
- [ ] DOCX bullet/numbered lists formatted
- [ ] Text selection works in rendered DOCX
- [ ] Existing PDF rendering unchanged
- [ ] Existing Markdown rendering unchanged
- [ ] Existing Text rendering unchanged

### Phase 2 Verification
- [ ] Existing text/markdown highlights still work
- [ ] New DOCX highlights save to database
- [ ] Highlights persist after page refresh
- [ ] "Ask AI" works from DOCX selection
- [ ] Copy works from DOCX selection

### Phase 3 Verification
- [ ] Unified toolbar shows on all document types
- [ ] View mode toggle switches between rendered/text
- [ ] Responsive layout works at all breakpoints

---

## Research Worktree References

Full research documents available in:

- `/Users/gianmariatroiani/Downloads/Gian Vision/code/research-ui-ux/DOCUMENT_VIEWER_FIDELITY_UX_RESEARCH.md`
- `/Users/gianmariatroiani/Downloads/Gian Vision/code/research-data-model/NEW FEATURES.md`
- `/Users/gianmariatroiani/Downloads/Gian Vision/code/research-upload-pipeline/NEW FEATURES.md`
- `/Users/gianmariatroiani/Downloads/Gian Vision/code/research-rendering-engine/NEW FEATURES.md`
- `/Users/gianmariatroiani/Downloads/Gian Vision/code/research-format-handling/NEW FEATURES.md`
- `/Users/gianmariatroiani/Downloads/Gian Vision/code/research-integration/NEW FEATURES.md`

---

## Appendix: Alternative Approaches Evaluated

### Mammoth.js (Rejected)
- Produces semantic HTML but loses visual formatting
- Font sizes, colors, alignment not preserved
- Suitable for content extraction, not display

### react-doc-viewer (Evaluated)
- Generic document viewer
- Less control over DOCX rendering
- Heavier bundle

### Apryse/PSPDFKit (Commercial)
- Excellent fidelity
- Requires commercial license
- Overkill for this use case
