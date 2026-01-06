# PDF Highlighting Implementation Plan

**Consolidated Research from 6 Worktrees**
**Date:** 2026-01-06
**Target:** Implement working PDF highlighting with proper architecture

---

## Executive Summary

**Critical Finding:** PDF highlighting is **NOT IMPLEMENTED** in the current codebase.

The UI components exist (SelectionTooltip, useTextSelection, useAnnotations), and highlights are correctly saved to the database. However:
1. `ReaderContent.jsx` does **NOT pass** `highlights` prop to `PDFRenderer`
2. `PDFRenderer.jsx` has **NO highlight rendering logic**
3. The offset-based positioning used for Markdown/DOCX is **incompatible** with PDF's multi-page structure

**Implementation Verdict Across All Worktrees:**

| Worktree | Component | Verdict |
|----------|-----------|---------|
| UI/UX | SelectionTooltip, colors | VALID (minor fixes) |
| Data Model | Annotations schema | NEEDS CHANGES for PDF |
| Text Selection | useTextSelection hook | VALID, critical PDF prop bug |
| Annotation Rendering | AnnotationLayer | VALID for HTML, N/A for PDF |
| PDF-Specific | react-pdf integration | NEEDS NEW IMPLEMENTATION |
| System Integration | AI, progress, learning | VALID, highlights not wired |

---

## Research Summary

### 1. UI/UX Research (highlight-worktrees/ui-ux)

**Status:** VALID with minor improvements needed

**What Works:**
- One-click highlight matches Kindle UX pattern
- Smooth animations with CSS keyframes
- Click-outside handling via class detection
- Copy feedback with confirmation state
- Real-time Supabase sync

**Issues Found:**
| Issue | Severity | Fix |
|-------|----------|-----|
| PDF scroll container mismatch | HIGH | Use container scroll, not window.scrollY |
| No vertical boundary check | MEDIUM | Flip tooltip below if near top |
| Unused color picker | LOW | Implement or remove dead code |
| No touch/mobile handling | LOW | Add touchend listener |

### 2. Data Model Research (highlight-worktrees/data-model)

**Status:** NEEDS CHANGES for PDF

**Current Schema Works For:** Markdown, DOCX, Text (offset-based)

**Problem for PDFs:**
- PDF text layer offsets are unstable across PDF.js versions
- Multi-column layouts extract text in unexpected order
- Each page resets offset to 0 (not cumulative)

**Required Schema Extension:**
```sql
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS position_type TEXT DEFAULT 'offset';
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS pdf_rect JSONB;
-- pdf_rect: {"page": 1, "x": %, "y": %, "width": %, "height": %}
```

### 3. Text Selection Research (highlight-worktrees/text-selection)

**Status:** VALID algorithm, CRITICAL BUG in prop passing

**Offset Calculation:** Correct for text-based documents

**CRITICAL BUG Found:**
```jsx
// ReaderContent.jsx - PDF case DOES NOT pass highlights
case 'pdf':
  return (
    <PDFRenderer
      fileUrl={fileUrl}
      onPageChange={onPageChange}
      // MISSING: highlights={highlights}
      // MISSING: onDeleteHighlight={onDeleteHighlight}
    />
  )
```

**Cross-Page Selection:** Not supported by react-pdf (each page is isolated DOM)

### 4. Annotation Rendering Research (highlight-worktrees/rendering)

**Status:** VALID for HTML, requires new component for PDF

**TreeWalker Approach:** Works for Markdown/DOCX because content is native HTML text nodes.

**Why It Fails for PDF:**
1. Text layer uses absolute positioning with PDF coordinates
2. Character offsets per page, not continuous
3. Canvas renders actual text; text layer is invisible overlay

**Solution:** Create `PDFAnnotationLayer` with page-based rectangle rendering

### 5. PDF-Specific Research (highlight-worktrees/pdf-specific)

**Status:** NEEDS NEW IMPLEMENTATION

**react-pdf Capabilities:**
- `renderTextLayer={true}` enables native browser selection
- Selection accessible via `window.getSelection()`
- NO built-in highlight persistence
- NO cross-page selection

**Known react-pdf Issues:**
- [#101](https://github.com/wojtekmaj/react-pdf/issues/101): Text selection jumps (div ordering)
- [#279](https://github.com/wojtekmaj/react-pdf/issues/279): No highlight example

**Required Architecture:**
```
┌─────────────────────────────────────────┐
│ PDF Page Container                       │
│ ├── Canvas Layer (PDF rendering)        │
│ ├── Text Layer (invisible, for select)  │
│ └── Highlight Layer (NEW - absolute)    │← Implement this
└─────────────────────────────────────────┘
```

### 6. System Integration Research (highlight-worktrees/integration)

**Status:** VALID, but PDF highlights not wired

**Working:**
- "Ask AI" with selected text
- Reading progress tracking
- Annotation storage
- Real-time subscriptions
- Markdown/DOCX/Text highlighting

**Not Working:**
- PDF highlight display (prop not passed)
- PDF highlight creation (no page context captured)

---

## Consolidated Implementation Plan

### Phase 0: Wire Up Existing Props (P0 - 5 minutes)

**File:** `web/src/components/reader/ReaderContent.jsx`

```diff
case 'pdf':
  return (
    <PDFRenderer
      fileUrl={fileUrl}
      onPageChange={onPageChange}
      onScroll={onScroll}
      initialPage={initialPage}
+     highlights={highlights}
+     onDeleteHighlight={onDeleteHighlight}
    />
  )
```

This alone won't make PDF highlighting work (PDFRenderer doesn't render them), but it's the necessary first step.

---

### Phase 1: Database Schema (P0 - 10 minutes)

**File:** `migrations/m39_pdf_annotations.sql`

```sql
-- M39: PDF Annotation Support
-- Add page-based positioning for PDF highlights

-- 1. Add position type discriminator
ALTER TABLE annotations
ADD COLUMN IF NOT EXISTS position_type TEXT DEFAULT 'offset'
CHECK (position_type IN ('offset', 'page_rect'));

-- 2. Add PDF page-based coordinates
-- Format: [{"page": 1, "x": 10, "y": 20, "width": 30, "height": 5}]
ALTER TABLE annotations
ADD COLUMN IF NOT EXISTS pdf_rects JSONB;

-- 3. Migrate existing annotations
UPDATE annotations
SET position_type = 'offset'
WHERE position_type IS NULL;

-- 4. Index for filtering
CREATE INDEX IF NOT EXISTS idx_annotations_position_type
ON annotations(source_id, position_type);
```

---

### Phase 2: PDF Selection Capture (P0 - 2 hours)

**File:** `web/src/hooks/useTextSelection.js`

Add PDF-aware selection that captures page context:

```javascript
const getSelectionInfo = useCallback(() => {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed) return null

  const text = selection.toString().trim()
  if (text.length < 3) return null

  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  // Detect if selection is within a PDF page
  const pageElement = range.startContainer.parentElement?.closest('[data-page-number]')

  if (pageElement) {
    // PDF selection - use page-based positioning
    const pageNumber = parseInt(pageElement.dataset.pageNumber, 10)
    const pageRect = pageElement.getBoundingClientRect()

    return {
      text,
      isPDF: true,
      pageNumber,
      pdfRect: {
        page: pageNumber,
        x: ((rect.left - pageRect.left) / pageRect.width) * 100,
        y: ((rect.top - pageRect.top) / pageRect.height) * 100,
        width: (rect.width / pageRect.width) * 100,
        height: (rect.height / pageRect.height) * 100
      },
      rect: {
        tooltipX: rect.left + (rect.width / 2),
        tooltipY: rect.top,
        width: rect.width,
        height: rect.height
      }
    }
  }

  // Non-PDF selection - use existing offset logic
  // ... existing offset calculation ...
}, [containerRef])
```

---

### Phase 3: PDFRenderer Props & Page Data Attributes (P0 - 30 minutes)

**File:** `web/src/components/reader/PDFRenderer.jsx`

1. Accept highlights prop
2. Add data-page-number to each page container
3. Pass to PDFAnnotationLayer

```diff
const PDFRenderer = memo(function PDFRenderer({
  fileUrl,
  onPageChange,
  onScroll,
  initialPage = 1,
+ highlights = [],
+ onDeleteHighlight
}) {
```

```diff
<div
  key={`page_${index + 1}`}
  ref={(el) => { pageRefs.current[index + 1] = el }}
  className="relative"
+ data-page-number={index + 1}
>
  <Page pageNumber={index + 1} ... />
+ <PDFHighlightLayer
+   pageNumber={index + 1}
+   highlights={highlights.filter(h => h.page_number === index + 1)}
+   onDeleteHighlight={onDeleteHighlight}
+ />
</div>
```

---

### Phase 4: PDFHighlightLayer Component (P1 - 2 hours)

**File:** `web/src/components/reader/PDFHighlightLayer.jsx`

```jsx
import { memo, useState } from 'react'
import { Trash2 } from 'lucide-react'

const PDFHighlightLayer = memo(function PDFHighlightLayer({
  pageNumber,
  highlights,
  onDeleteHighlight
}) {
  const [hoveredId, setHoveredId] = useState(null)

  if (!highlights || highlights.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {highlights.map(highlight => {
        const rects = highlight.pdf_rects || []

        return rects
          .filter(r => r.page === pageNumber)
          .map((rect, i) => (
            <div
              key={`${highlight.id}-${i}`}
              className="absolute pointer-events-auto cursor-pointer transition-all hover:brightness-90"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: highlight.color || '#FFEB3B',
                opacity: 0.4,
                borderRadius: '2px'
              }}
              onMouseEnter={() => setHoveredId(highlight.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onDeleteHighlight?.(highlight.id)}
            >
              {hoveredId === highlight.id && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </div>
              )}
            </div>
          ))
      })}
    </div>
  )
})

export default PDFHighlightLayer
```

---

### Phase 5: Update useAnnotations for PDF (P1 - 1 hour)

**File:** `web/src/hooks/useAnnotations.js`

Modify `createHighlight` to handle PDF selections:

```javascript
const createHighlight = async (selection, color = '#FFEB3B') => {
  const newAnnotation = {
    id: `temp_${Date.now()}`,
    source_id: sourceId,
    annotation_type: 'highlight',
    selected_text: selection.text.substring(0, 500),
    color,
    created_at: new Date().toISOString()
  }

  if (selection.isPDF) {
    // PDF-specific positioning
    newAnnotation.position_type = 'page_rect'
    newAnnotation.page_number = selection.pageNumber
    newAnnotation.pdf_rects = [selection.pdfRect]
  } else {
    // Offset-based positioning (existing logic)
    newAnnotation.position_type = 'offset'
    newAnnotation.start_offset = selection.startOffset
    newAnnotation.end_offset = selection.endOffset
  }

  // ... rest of optimistic update logic
}
```

---

### Phase 6: Minor UI Fixes (P2 - 1 hour)

**File:** `web/src/components/reader/SelectionTooltip.jsx`

1. Add vertical boundary check:
```javascript
let top = selection.rect.tooltipY - tooltipRect.height - 8
if (top < 10) {
  top = selection.rect.tooltipY + selection.rect.height + 8
}
```

2. Either implement color picker or remove dead code

**File:** `web/src/hooks/useTextSelection.js`

1. Increase debounce for mobile:
```javascript
const SELECTION_DEBOUNCE = /Mobile|Android/i.test(navigator.userAgent) ? 100 : 10
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `migrations/m39_pdf_annotations.sql` | Schema for PDF positioning |
| `web/src/components/reader/PDFHighlightLayer.jsx` | Per-page highlight overlay |

### Modified Files

| File | Change |
|------|--------|
| `web/src/components/reader/ReaderContent.jsx` | Pass highlights to PDFRenderer |
| `web/src/components/reader/PDFRenderer.jsx` | Accept highlights, add page data attributes |
| `web/src/hooks/useTextSelection.js` | PDF-aware selection capture |
| `web/src/hooks/useAnnotations.js` | Handle PDF position type |
| `web/src/components/reader/SelectionTooltip.jsx` | Boundary fixes |

---

## Effort Estimates

| Phase | Task | Effort |
|-------|------|--------|
| Phase 0 | Wire up props | 5 min |
| Phase 1 | Database schema | 10 min |
| Phase 2 | PDF selection capture | 2 hours |
| Phase 3 | PDFRenderer updates | 30 min |
| Phase 4 | PDFHighlightLayer | 2 hours |
| Phase 5 | useAnnotations update | 1 hour |
| Phase 6 | UI fixes | 1 hour |
| **Total** | | **~7 hours** |

---

## Testing Checklist

### PDF Highlighting
- [ ] Select text on page 1 of PDF
- [ ] Tooltip appears above selection
- [ ] Click Highlight creates yellow highlight
- [ ] Highlight persists after page refresh
- [ ] Highlight appears at correct position
- [ ] Clicking highlight shows delete option
- [ ] Delete removes highlight from page and DB
- [ ] Multi-line selection within page works
- [ ] Different pages have separate highlights

### Existing Functionality Preserved
- [ ] Markdown highlighting still works
- [ ] DOCX highlighting still works
- [ ] Text highlighting still works
- [ ] "Ask AI" still works
- [ ] "Copy" still works
- [ ] Reading progress still tracks

### Edge Cases
- [ ] Zoom in/out preserves highlight positions
- [ ] Very long selections (full paragraph) work
- [ ] Highlights near page edges display correctly
- [ ] Mobile selection works (50ms+ debounce)

---

## Known Limitations (Accepted)

1. **No cross-page selection** - react-pdf limitation, each page is isolated
2. **No rotation support** - Deferred for future milestone
3. **Text layer ordering** - May cause selection jumps (react-pdf issue #101)

---

## Research Worktree References

Full research documents in:
- `/highlight-worktrees/ui-ux/NEW FEATURES.md`
- `/highlight-worktrees/data-model/NEW FEATURES.md`
- `/highlight-worktrees/text-selection/NEW FEATURES.md`
- `/highlight-worktrees/rendering/NEW FEATURES.md`
- `/highlight-worktrees/pdf-specific/NEW FEATURES.md`
- `/highlight-worktrees/integration/NEW FEATURES.md`
