# PowerPoint (PPTX) Rendering Implementation Plan

**Consolidated Research from 6 Worktrees**
**Date:** 2026-01-06
**Target:** Add PowerPoint document rendering capability to the Personal Learning System

---

## Executive Summary

**CRITICAL FINDING: Do NOT use pptx2html**

The pptx2html library has been **abandoned for 8 years**, has an **unpatched XSS vulnerability**, and lacks essential features. The recommended approach is **server-side PPTX→PDF conversion using LibreOffice + unoserver**, then leveraging the existing PDFRenderer for display.

### Recommendation Matrix

| Approach | Verdict | Reason |
|----------|---------|--------|
| **pptx2html** | ❌ DO NOT USE | Abandoned, XSS vulnerability, poor feature support |
| **PPTXjs** | ⚠️ Fallback | Better than pptx2html, but jQuery dependency, open issues |
| **LibreOffice + unoserver** | ✅ RECOMMENDED | High fidelity, reuses existing PDFRenderer, free |
| **Commercial (Nutrient, Apryse)** | ❌ Overkill | Expensive, unnecessary for learning system |

### Feature Parity After Implementation

| Feature | PDF | DOCX | Markdown | Text | PPTX (Proposed) |
|---------|-----|------|----------|------|-----------------|
| Upload | ✅ | ✅ | ✅ | ✅ | **✅** |
| View in reader | ✅ | ✅ | ✅ | ✅ | **✅** (as PDF) |
| Reading progress | ✅ page | ✅ scroll | ✅ scroll | ✅ scroll | **✅ slide/page** |
| Text highlighting | ✅ | ✅ | ✅ | ✅ | **✅** (on converted PDF) |
| AI chat | ✅ | ✅ | ✅ | ✅ | **✅** |
| KC extraction | ✅ | ✅ | ✅ | ✅ | **✅** |
| Practice items | ✅ | ✅ | ✅ | ✅ | **✅** |

---

## Research Summary by Worktree

| Worktree | Focus | Key Finding |
|----------|-------|-------------|
| **1. Library Analysis** | pptx2html evaluation | Abandoned 8 years, XSS vulnerability, DO NOT USE |
| **2. Alternatives** | Other rendering options | LibreOffice + unoserver recommended |
| **3. UI/UX** | Slide display patterns | Continuous scroll view matches existing PDF behavior |
| **4. Data Model** | Storage strategy | Store original PPTX, add `slide_count` column |
| **5. Upload Pipeline** | Backend processing | python-pptx for text extraction, LibreOffice for PDF conversion |
| **6. System Integration** | Full integration analysis | Minimal changes needed, follows established patterns |

---

## Consolidated Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  UPLOAD FLOW                                                                  │
│                                                                               │
│  Browser ──> FastAPI ──> Supabase Storage (original .pptx)                  │
│                    │                                                          │
│                    └──> Background Task                                       │
│                           ├─> python-pptx: Extract text, slide titles       │
│                           ├─> unoserver: Convert PPTX → PDF                  │
│                           ├─> Supabase Storage: Store converted PDF          │
│                           └─> LLM: Generate KCs + Practice Items             │
│                                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  VIEWING FLOW                                                                 │
│                                                                               │
│  Reader Page ──> ReaderContent.jsx                                          │
│                    │                                                          │
│                    └─> contentType === 'pptx'                                │
│                           └─> Fetch converted PDF URL                        │
│                                └─> PDFRenderer (existing!)                   │
│                                     ├─> Continuous scroll view               │
│                                     ├─> Text selection                       │
│                                     └─> Highlighting (works on PDF)          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Backend - Text Extraction (Priority: P0)

**Goal:** Extract text from PPTX for KC generation

**Files:**

| File | Change |
|------|--------|
| `requirements.txt` | Add `python-pptx>=1.0.0` |
| `learn_system/app/ingestion/extractors.py` | Add `extract_pptx()` function |
| `learn_system/app/api/routes/sources.py` | Add `.pptx`, `.ppt` to `ALLOWED_EXTENSIONS` |

**Implementation:**

```python
# extractors.py
from pptx import Presentation

def extract_pptx(file_path: str) -> str:
    """Extract text from PPTX including shapes, tables, speaker notes."""
    prs = Presentation(file_path)
    text_parts = []

    for slide_num, slide in enumerate(prs.slides, 1):
        slide_text = [f"=== Slide {slide_num} ==="]

        # Extract title
        if slide.shapes.title and slide.shapes.title.has_text_frame:
            title = slide.shapes.title.text.strip()
            if title:
                slide_text.append(f"Title: {title}")

        # Extract body text + tables
        for shape in slide.shapes:
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    if para.text.strip():
                        slide_text.append(para.text.strip())
            if shape.has_table:
                for row in shape.table.rows:
                    row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_text:
                        slide_text.append(" | ".join(row_text))

        # Speaker notes
        if slide.has_notes_slide:
            notes = slide.notes_slide.notes_text_frame.text.strip()
            if notes:
                slide_text.append(f"[Speaker Notes]: {notes}")

        text_parts.append("\n".join(slide_text))

    return "\n\n".join(text_parts)

# Update dispatch table
extractors = {
    # ... existing ...
    '.pptx': (extract_pptx, 'pptx'),
    '.ppt': (extract_pptx, 'pptx'),
}
```

---

### Phase 2: Backend - PDF Conversion (Priority: P0)

**Goal:** Convert PPTX to PDF for viewing

**Option A: Docker with unoserver (Recommended for Production)**

```yaml
# docker-compose.yml
services:
  libreoffice:
    image: libreofficedocker/libreoffice-unoserver:3.19
    ports:
      - "2004:2004"
    restart: unless-stopped
```

```python
# learn_system/app/services/conversion.py
import httpx

UNOSERVER_URL = "http://libreoffice:2004/request"

async def convert_pptx_to_pdf(pptx_bytes: bytes, filename: str) -> bytes:
    """Convert PPTX to PDF using unoserver."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {"file": (filename, pptx_bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation")}
        data = {"convert-to": "pdf"}
        response = await client.post(UNOSERVER_URL, files=files, data=data)
        response.raise_for_status()
        return response.content
```

**Option B: Local LibreOffice (Development)**

```python
import subprocess
from pathlib import Path

def convert_pptx_to_pdf_local(pptx_path: Path, output_dir: Path) -> Path:
    """Convert using local LibreOffice installation."""
    subprocess.run([
        'soffice', '--headless', '--convert-to', 'pdf',
        '--outdir', str(output_dir), str(pptx_path)
    ], check=True, timeout=60)
    return output_dir / f"{pptx_path.stem}.pdf"
```

---

### Phase 3: Database Schema (Priority: P0)

**File:** `migrations/m40_pptx_support.sql`

```sql
-- M40: PPTX Support
-- Add slide_count column for presentations

ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS slide_count INTEGER;

COMMENT ON COLUMN content_sources.slide_count IS
  'Number of slides for PPTX files. NULL for non-presentation documents.';

-- Store path to converted PDF
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS converted_pdf_path TEXT;

COMMENT ON COLUMN content_sources.converted_pdf_path IS
  'Supabase Storage path to converted PDF (for PPTX sources).';

-- Index for content type filtering
CREATE INDEX IF NOT EXISTS idx_content_sources_content_type
ON content_sources(content_type);
```

---

### Phase 4: Frontend - Content Type Detection (Priority: P0)

**File:** `web/src/components/reader/ReaderContent.jsx`

```diff
function getContentType(mimeType, title) {
  if (title) {
    const ext = title.toLowerCase().split('.').pop()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'md' || ext === 'markdown') return 'markdown'
    if (ext === 'txt') return 'text'
    if (ext === 'docx' || ext === 'doc') return 'docx'
+   if (ext === 'pptx' || ext === 'ppt') return 'pptx'
  }

  if (!mimeType) return 'unknown'

+ if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx'
  // ... existing checks ...
}

const renderContent = () => {
  switch (contentType) {
    // ... existing cases ...

+   case 'pptx':
+     // Use converted PDF for viewing
+     if (!convertedPdfUrl) {
+       return <FallbackView message="Converting presentation..." />
+     }
+     return (
+       <PDFRenderer
+         fileUrl={convertedPdfUrl}
+         onPageChange={onPageChange}
+         onScroll={onScroll}
+         initialPage={initialPage}
+         highlights={highlights}
+         onDeleteHighlight={onDeleteHighlight}
+       />
+     )

    default:
      return <FallbackView ... />
  }
}
```

---

### Phase 5: API Endpoint for Converted PDF (Priority: P1)

**File:** `learn_system/app/api/routes/sources.py`

```python
@router.get("/{source_id}/pdf-url")
async def get_converted_pdf_url(source_id: str):
    """Get signed URL for converted PDF (for PPTX sources)."""
    source = await get_source(source_id)

    if source.content_type != 'pptx':
        raise HTTPException(400, "Not a PPTX source")

    if not source.converted_pdf_path:
        raise HTTPException(404, "PDF conversion not complete")

    url = supabase.storage.from_("documents").create_signed_url(
        source.converted_pdf_path, expires_in=3600
    )
    return {"url": url}
```

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `migrations/m40_pptx_support.sql` | Schema for slide_count, converted_pdf_path |
| `learn_system/app/services/conversion.py` | PPTX→PDF conversion logic |

### Modified Files

| File | Change |
|------|--------|
| `requirements.txt` | Add `python-pptx>=1.0.0` |
| `learn_system/app/ingestion/extractors.py` | Add `extract_pptx()` |
| `learn_system/app/api/routes/sources.py` | Add `.pptx` extensions, new endpoint |
| `learn_system/app/api/services/processing.py` | Add PDF conversion step for PPTX |
| `web/src/components/reader/ReaderContent.jsx` | Add PPTX content type routing |
| `docker-compose.yml` | Add unoserver container (optional) |

---

## Known Limitations (Accepted)

1. **Animations/transitions lost** - Slides become static in PDF
2. **SmartArt text may not extract** - python-pptx limitation
3. **Conversion latency** - 2-5 seconds per presentation
4. **LibreOffice sequential processing** - One conversion at a time without scaling

---

## Testing Checklist

### Upload & Processing
- [ ] Upload PPTX file successfully
- [ ] Text extraction includes slide titles
- [ ] Text extraction includes speaker notes
- [ ] Text extraction includes table content
- [ ] PDF conversion completes
- [ ] KCs generated from extracted text
- [ ] Practice items reference slide content

### Viewing
- [ ] PPTX opens in reader
- [ ] Displays as converted PDF
- [ ] Page/slide navigation works
- [ ] Reading progress tracks correctly
- [ ] Text selection works on converted PDF
- [ ] Highlighting works on converted PDF
- [ ] Highlights persist across sessions

### Edge Cases
- [ ] Large presentation (100+ slides)
- [ ] Presentation with only images (minimal text)
- [ ] Password-protected PPTX rejected with clear error
- [ ] Corrupted PPTX file handled gracefully

---

## Dependencies

| Package | Version | Purpose | License |
|---------|---------|---------|---------|
| python-pptx | >=1.0.0 | PPTX parsing | MIT |
| LibreOffice | 7.x+ | PDF conversion | MPL 2.0 |
| libreoffice-unoserver | Docker image | REST API for LibreOffice | MIT |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| LibreOffice not available | Medium | High | Fallback: show "download original" link |
| Conversion timeout | Low | Medium | Queue with retry, increase timeout |
| Poor text extraction | Medium | Low | Speaker notes help, manual review |
| .ppt (legacy) fails | High | Low | Document ".pptx only" support |

---

## Research Worktree References

Detailed research from each worktree is available at:
- `pptx-research-1-library/NEW FEATURES.md` - pptx2html analysis (DO NOT USE)
- `pptx-research-2-alternatives/NEW FEATURES.md` - LibreOffice + unoserver recommended
- `pptx-research-3-ui-ux/NEW FEATURES.md` - Continuous scroll view, navigation patterns
- `pptx-research-4-data-model/NEW FEATURES.md` - Store PPTX only, add slide_count
- `pptx-research-5-upload-pipeline/NEW FEATURES.md` - python-pptx extraction code
- `pptx-research-6-integration/NEW FEATURES.md` - Full system integration analysis

---

## Summary

The PPTX implementation follows a **convert-to-PDF** strategy that:

1. **Maximizes code reuse** - Leverages existing PDFRenderer, highlighting, progress tracking
2. **Ensures high fidelity** - LibreOffice produces accurate PDF output
3. **Avoids security risks** - No vulnerable client-side libraries
4. **Minimizes frontend changes** - Only content type detection needed
5. **Supports all existing features** - Text selection, highlighting, AI chat work on converted PDF

**Total Estimated Effort:** 2-3 days for MVP
