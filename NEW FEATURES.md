# NEW FEATURES

This document contains research and implementation plans for proposed features that are not yet part of the active milestone roadmap.

---

## Source-Grounded Practice Items (Grounding Fix)

**Status:** Research Complete | Ready for Implementation
**Date:** 2026-01-19
**Research Worktrees:** 6 parallel research branches in `/grounding-worktrees/`

### Executive Summary

**Problem:** Practice items test concepts not present in the source document. The LLM fills gaps with general domain knowledge, creating items that require knowledge the user has no way of having learned from the material.

**Important Nuance:** Grounding does NOT mean pure memorization. Valid items may require reasoning, inference, and application of prerequisite knowledge appropriate to the domain (e.g., Terraform docs can assume Python knowledge). The problem is items requiring significant knowledge not derivable from the source + reasonable prerequisites.

**Root Cause:** The `source_excerpt` field exists in `knowledge_components` table but is **never populated**. KC extraction captures name/description but not the verbatim source text. Practice item generation receives only name, description, and complexity—no source context.

**Solution:** Two-phase fix requiring **3 Python files**, **no database migrations**, and **no API changes**:
1. Modify KC extraction to request and store source excerpts
2. Modify practice item templates to include source context and grounding constraints

**Effort Estimate:** 1-2 days implementation + 1 day testing

---

### Problem Analysis

#### Current Data Flow (Broken)

```
Document (PDF/DOCX/MD)
    │
    ▼
extractors.py:extract_text() → raw text string
    │
    ▼
kc_extractor.py:extract_kcs() → {name, description, type, complexity}
    │                            ✗ NO source_excerpt
    ▼
knowledge_components table → source_excerpt = NULL
    │
    ▼
generator.py → receives KC with NULL source_excerpt
    │
    ▼
templates.py → prompts contain only name/description
    │
    ▼
Practice items generated from LLM's general knowledge ✗
```

#### Evidence of Problem

| Symptom | Example |
|---------|---------|
| Items reference concepts not in source | "What are the three types of attention?" when source only mentions self-attention |
| Expected answers contain fabricated details | Specific numbers, examples, or edge cases not in document |
| Troubleshooting items unsolvable | "What happens if X fails?" when source never discusses failure modes |
| Comparisons to unmentioned concepts | "Compare this with Y" when Y is never mentioned |

#### Root Cause Analysis

**kc_extractor.py (lines 65-97)** — Current extraction prompt:
```python
KC_EXTRACTION_PROMPT = """...
For each distinct concept, skill, or fact that a learner should master, extract:
1. name: A concise identifier (3-8 words)
2. description: What the learner should know or be able to do
3. knowledge_type: ...
4. cognitive_level: ...
5. intrinsic_complexity: ...
6. prerequisites: ...
# ✗ NO source_excerpt field requested
"""
```

**templates.py (all 4 functions)** — Current prompts:
```python
def get_factual_prompt(kc: dict) -> str:
    return """Generate practice items for this FACTUAL knowledge component.

    Knowledge Component:
    - Name: {name}
    - Description: {description}
    - Complexity: {complexity}/5
    # ✗ NO source context provided
    # ✗ NO grounding constraints
    """
```

---

### Solution Design

#### Key Finding: Schema Already Supports Grounding

```sql
-- From database/schema.sql
CREATE TABLE IF NOT EXISTS knowledge_components (
    ...
    source_excerpt TEXT,  -- EXISTS but always NULL
    ...
);
```

**No database migrations required.** The field exists and `insert_kcs_batch()` already accepts it.

#### Implementation: Phase 1 (KC Extraction)

**File:** `learn_system/app/ingestion/kc_extractor.py`

1. **Update KC_EXTRACTION_PROMPT** (lines 65-97):
```python
KC_EXTRACTION_PROMPT = """You are analyzing educational content to extract learnable knowledge components.

For each distinct concept, skill, or fact that a learner should master, extract:
1. name: A concise identifier (3-8 words)
2. description: What the learner should know or be able to do (1-3 sentences)
3. knowledge_type: One of factual, conceptual, procedural_cognitive, procedural_execution
4. cognitive_level: One of remember, understand, apply, analyze, evaluate, create
5. intrinsic_complexity: 1-5 where 1 is simple definition, 5 is complex multi-step concept
6. prerequisites: Names of other KCs that should be learned first (if any)
7. source_excerpt: The EXACT verbatim quote (50-200 words) from the content that teaches this concept. Copy directly—do not paraphrase.

IMPORTANT: source_excerpt must be a direct quote. This will be used to ground practice questions in the actual source material.

Example output format:
[
  {{
    "name": "Definition of Retrieval Practice",
    "description": "Retrieval practice strengthens memory more effectively than passive review.",
    "knowledge_type": "factual",
    "cognitive_level": "remember",
    "intrinsic_complexity": 2,
    "prerequisites": [],
    "source_excerpt": "Retrieval practice—the act of calling information to mind rather than rereading or passively reviewing it—has been shown in hundreds of studies to strengthen memory more effectively than any other study technique."
  }}
]

Content to analyze:
{content}"""
```

2. **Update parse_llm_response()** (lines 226-233):
```python
validated_kcs.append({
    'name': str(kc['name']).strip(),
    'description': str(kc['description']).strip(),
    'knowledge_type': ktype,
    'cognitive_level': level,
    'intrinsic_complexity': complexity,
    'prerequisites': prereqs,
    'source_excerpt': str(kc.get('source_excerpt', '')).strip(),  # ADD
})
```

3. **Update store_extracted_kcs()** (lines 332-346):
```python
kcs_data.append({
    'source_id': source_id,
    'name': kc['name'],
    'description': kc['description'],
    'knowledge_type': kc['knowledge_type'],
    'cognitive_level': kc['cognitive_level'],
    'intrinsic_complexity': kc['intrinsic_complexity'],
    'domain': domain,
    'source_excerpt': kc.get('source_excerpt'),  # ADD
    'metadata': {'prerequisites': kc.get('prerequisites', [])}
})
```

#### Implementation: Phase 2 (Practice Item Generation)

**File:** `learn_system/app/practice/templates.py`

Update all 4 template functions to include source context and grounding constraints:

```python
def get_factual_prompt(kc: dict) -> str:
    """Returns LLM prompt for generating grounded factual practice items."""

    source_section = ""
    source_excerpt = kc.get('source_excerpt', '')
    if source_excerpt:
        source_section = f"""
---SOURCE EXCERPT---
{source_excerpt}
---END SOURCE---

GROUNDING RULES:
- Questions must be answerable by reading the source excerpt + applying reasonable prerequisite knowledge for the domain
- You MAY require reasoning, inference, or application of concepts from the excerpt
- You MAY assume foundational knowledge appropriate to the topic (e.g., programming basics for a coding tutorial)
- DO NOT require knowledge of facts, terminology, or concepts not mentioned in the excerpt unless they are obvious prerequisites
- DO NOT invent specific details, numbers, or examples not present in or derivable from the excerpt
- If asked to create application/troubleshooting items, the scenario must be solvable using the excerpt's information + reasonable domain knowledge
"""

    return f"""Generate practice items for this FACTUAL knowledge component.

Knowledge Component:
- Name: {kc['name']}
- Description: {kc['description']}
- Complexity: {kc.get('intrinsic_complexity', 3)}/5
{source_section}
Generate up to 3 practice items with varying difficulty:
1. A free_recall item (difficulty 1-2): Ask the learner to recall the definition/fact from memory
2. A cued_recall item (difficulty 2-3): Provide a partial hint, ask them to complete it
3. A recognition item (difficulty 1): Multiple choice where learner selects the correct answer

IMPORTANT: Each item must be answerable using ONLY the source excerpt. Do not test facts not explicitly stated.

For each item provide:
- practice_mode: "free_recall", "cued_recall", or "recognition"
- difficulty_level: 1-5
- prompt: The question to ask (must reference only source content)
- expected_response: The correct answer (must come from source excerpt)
- hints: List of 2-3 progressive hints
- rubric: Brief criteria for self-assessment
- source_quote: The specific phrase this item tests (for verification)

Return as a JSON array."""
```

Apply similar pattern to:
- `get_conceptual_prompt()` — Add "DO NOT ask for comparisons to concepts not in the excerpt"
- `get_procedural_cognitive_prompt()` — Add "DO NOT invent troubleshooting scenarios not in the excerpt"
- `get_procedural_execution_prompt()` — Add "DO NOT add constraints from general knowledge"

**File:** `learn_system/app/practice/generator.py`

No changes required. `generate_items_for_kc()` already passes the full KC dict (including source_excerpt) to templates. Once templates use it, generation is automatically grounded.

---

### Files to Modify

| File | Change | Lines | Effort |
|------|--------|-------|--------|
| `learn_system/app/ingestion/kc_extractor.py` | Add source_excerpt to extraction prompt | 65-97 | Low |
| `learn_system/app/ingestion/kc_extractor.py` | Parse source_excerpt from response | 226-233 | Low |
| `learn_system/app/ingestion/kc_extractor.py` | Pass source_excerpt to batch insert | 332-346 | Low |
| `learn_system/app/practice/templates.py` | Add source context + grounding constraints | All 4 functions | Medium |

**No changes required:**
- Database schema (source_excerpt already exists)
- API contracts (source_excerpt already in KC model)
- Frontend (already displays source_excerpt when present)

---

### Migration Strategy

**Forward-Only Migration (Recommended)**

Only newly ingested documents will have grounded practice items. Existing KCs remain unchanged with NULL source_excerpt.

**Rationale:**
- Backfilling requires re-running extraction LLM (expensive)
- Existing items still functional, just less grounded
- Users can re-ingest specific documents if needed

**Optional Backfill (If Requested)**

```python
def backfill_source_excerpts(source_id: str):
    """Re-extract excerpts for existing KCs using text search."""
    source = get_source_by_id(source_id)
    kcs = get_kcs_for_source(source_id)

    for kc in kcs:
        # Find most relevant passage via keyword matching
        excerpt = find_relevant_excerpt(
            source.content,
            kc['name'],
            kc['description'],
            max_words=200
        )
        update_kc_excerpt(kc['id'], excerpt)
```

---

### Rollout Plan

| Day | Phase | Tasks |
|-----|-------|-------|
| 1 | KC Extraction | Modify prompt, parse response, store in DB |
| 1 | Testing | Ingest test document, verify excerpts populated |
| 2 | Item Generation | Update all 4 template functions with grounding |
| 2 | Testing | Generate items, verify grounding quality |
| 3 | Validation | Compare old vs new items for same document |
| 4+ | Optional UI | Add "View source context" to SelfAssessment |

---

### Testing Strategy

1. **Extraction Verification:**
```sql
SELECT name, LEFT(source_excerpt, 100) as excerpt_preview
FROM knowledge_components
WHERE source_excerpt IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;
```

2. **Grounding Validation:**
   - For each generated practice item, verify expected_response appears in source_excerpt
   - Check that `source_quote` field (new output) matches actual source text

3. **Quality Comparison:**
   - Ingest same document before/after fix
   - Compare practice items for "fabricated knowledge" vs "grounded knowledge"
   - Manual review of 10-20 items per knowledge type

4. **Graceful Degradation:**
   - Test with NULL source_excerpt (existing KCs)
   - Verify templates handle missing excerpt without breaking

---

### Success Criteria

| Metric | Target |
|--------|--------|
| source_excerpt populated | >95% of new KCs |
| Practice items grounded | 100% answerable from source + reasonable domain prerequisites |
| No unfair knowledge requirements | 0 items requiring knowledge not in source AND not a reasonable prerequisite |
| Backward compatibility | Existing items still functional |

---

### Cost Considerations

**Extraction:**
- Additional ~200 tokens output per KC (for source_excerpt)
- ~3000 extra tokens per chunk (15 KCs × 200 tokens)
- At $0.015/1K output tokens (Claude): ~$0.045 extra per chunk

**Mitigation:** Consider `max_excerpt_length` parameter (200 words) to cap token usage.

---

### Optional UI Enhancements (Future)

These are nice-to-have improvements that can follow the backend fix:

1. **SelfAssessment.jsx** — Add "View source context" collapsible
2. **QuestionCard.jsx** — Add "Show source hint" option
3. **Study.jsx** — Include source_excerpt in KC query (line 50)

UI changes are **not required** for the grounding fix to work. The backend fix operates independently.

---

### Research Artifacts

Full research documents available in worktrees:

| Focus Area | Path |
|------------|------|
| Data Model | `/grounding-worktrees/data-model/GROUNDING_RESEARCH.md` |
| KC Extraction | `/grounding-worktrees/kc-extraction/GROUNDING_RESEARCH.md` |
| Item Generation | `/grounding-worktrees/item-generation/GROUNDING_RESEARCH.md` |
| Prompt Engineering | `/grounding-worktrees/prompt-engineering/GROUNDING_RESEARCH.md` |
| UI/UX Impact | `/grounding-worktrees/ui-ux/GROUNDING_RESEARCH.md` |
| System Integration | `/grounding-worktrees/integration/GROUNDING_RESEARCH.md` |

---

### Next Steps

When ready to implement:

1. Read `.claude/memory/decisions/technology.md` for LLM provider constraints
2. Create branch `feature/grounded-practice-items` from DEV
3. Implement Phase 1 (kc_extractor.py) and test
4. Implement Phase 2 (templates.py) and test
5. Manual validation of item quality
6. Merge to DEV
