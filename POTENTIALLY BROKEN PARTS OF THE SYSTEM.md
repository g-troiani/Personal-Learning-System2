# Potentially Broken Parts of the System

**Investigation Date:** 2026-01-19
**Status:** Comprehensive audit of unpopulated database fields and broken processes
**Research Worktrees:** 6 parallel investigations in `/broken-process-worktrees/`

---

## Executive Summary

This investigation examined all database fields to find those that exist but are never populated—indicators of broken or incomplete functionality. The findings reveal a significant gap between the designed system and actual implementation.

### Key Findings

| Category | Count | Severity |
|----------|-------|----------|
| **Completely Dead Fields** | 19 fields | Various |
| **Entirely Unused Tables** | 4 tables | Medium-High |
| **Features That Cannot Work** | 3 features | Critical |
| **Web vs CLI Gaps** | 6 features | High |

### Critical Issues Discovered

1. **Web UI bypasses spaced repetition** — Items practiced via web are never scheduled for future review
2. **Calibration analysis is broken** — Confidence ratings are never collected before answers
3. **Self-experimentation feature is 90% unimplemented** — Technique bundles exist but don't modify behavior
4. **`source_excerpt` never populated** — Practice items can't be grounded in source material

---

## Part 1: Database Fields That Are Never Populated

### Category A: Completely Dead Fields (19 fields)

These fields exist in the schema but no code path ever writes to them:

| Table | Field | Purpose | Impact |
|-------|-------|---------|--------|
| `knowledge_components` | `source_excerpt` | Quote from source document | Practice items not grounded |
| `knowledge_components` | `practice_environment` | Where skill should be practiced | Missing context for execution tasks |
| `kc_state` | `learning_velocity` | Rate of improvement over time | Can't track learning speed |
| `kc_state` | `proceduralization_level` | Skill automation level | Can't measure skill automaticity |
| `kc_state` | `average_response_time_ms` | Mean response time | Can't analyze timing trends |
| `sessions` | `time_of_day` | Morning/afternoon/evening | Can't analyze optimal study times |
| `sessions` | `energy_level` | 1-5 energy rating | Can't correlate energy with performance |
| `sessions` | `focus_rating` | 1-5 focus rating | Can't analyze focus impact |
| `sessions` | `notes` | Session notes | No reflection mechanism |
| `attempts` | `hints_viewed` | Which specific hints shown | Can't analyze hint usage patterns |
| `attempts` | `time_before_first_hint_ms` | Time until first hint | Can't measure struggle duration |
| `attempts` | `iterations_to_complete` | Tries for execution tasks | Missing for procedural tracking |
| `attempts` | `explanation_provided` | Did user explain reasoning | Elaboration feature broken |
| `attempts` | `self_identified_gaps` | User-identified weaknesses | Self-reflection not captured |
| `attempts` | `acted_on_feedback` | Did user iterate on feedback | Feedback loop not tracked |
| `attempts` | `resources_accessed` | External resources used | Can't correlate with outcomes |
| `attempts` | `error_type` | Classification of errors | Error pattern analysis impossible |
| `attempts` | `errors_encountered` | Free text of errors | Missing for debugging |
| `practice_items` | `metadata` | Arbitrary item metadata | Generation context not stored |

### Category B: Entirely Unused Tables (4 tables)

| Table | Purpose | Status |
|-------|---------|--------|
| `learning_goals` | User-defined learning objectives | 100% unused—no UI, no API, no code |
| `kc_subskills` | Break down complex procedural KCs | 100% unused—designed but never built |
| `retention_tests` | Long-term retention measurement (7/30 day) | Table exists, never populated |
| `kc_prerequisites` | KC dependency relationships | LLM extracts names but relational table never populated |

### Category C: Fields Populated But Never Used

| Table | Field | Written | Read | Issue |
|-------|-------|---------|------|-------|
| `knowledge_components.metadata` | YES | Never | Contains prerequisites that are never used |
| `kc_state.plateau_detected` | Initialized FALSE | Checked | Never updated to TRUE |
| `kc_state.struggling_flag` | Initialized FALSE | Checked | Never updated to TRUE |
| `practice_items.rubric` | YES | Never | LLM generates but UI doesn't display |
| `practice_items.success_criteria` | YES | Never | LLM generates but UI doesn't display |

---

## Part 2: Broken Processes by Flow

### 2.1 Ingestion Pipeline Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| `source_excerpt` never captured | **HIGH** | `kc_extractor.py:65-97` | Practice items ungrounded |
| `content_type` hardcoded to 'text' | Medium | `queries.py:51` | Loses actual document type |
| Processing status columns unused | Medium | `queries.py:40-59` | Web UI progress may be stale |
| Prerequisites stored in metadata, not table | Medium | `kc_extractor.py:342` | Can't SQL-query prerequisites |
| `next_review_at` not initialized | **CRITICAL** | `queries.py:500-509` | New KCs may never appear in due queue |

#### Critical: `next_review_at` Bug

New KCs are created with NULL `next_review_at`. The due items query filters for `next_review_at <= now`, so NULL values never match. **New items may never appear for practice.**

### 2.2 Practice/Study Flow Issues

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| Web UI skips spaced repetition | **CRITICAL** | `Study.jsx:176-206` | Items never rescheduled |
| Web doesn't collect confidence_before | **HIGH** | `Study.jsx:148-166` | Calibration analysis broken |
| Web doesn't track hints | Medium | `QuestionCard.jsx:47-70` | Hint patterns not analyzed |
| Web doesn't record mastery_before/after | Medium | `Study.jsx:154-166` | Learning progress incomplete |
| Web ignores technique bundles | High | `Study.jsx:101` | A/B testing broken from web |

#### Critical: Web UI Bypasses Spaced Repetition

The Web UI updates `mastery_level` and `exposure_count` but:
- Does NOT update `next_review_at`
- Does NOT update `current_interval_days`
- Does NOT update `easiness_factor`

**Items practiced via Web UI are never scheduled for future review.** The core SM-2 algorithm is bypassed.

#### Data Collection Comparison

| Metric | CLI Coverage | Web Coverage | Gap |
|--------|--------------|--------------|-----|
| attempts table | 54% | 42% | -12% |
| sessions table | 62% | 46% | -16% |
| kc_state table | 64% | **21%** | **-43%** |

### 2.3 Self-Experimentation Feature (90% Broken)

The system's core differentiator—technique bundles for self-experimentation—is almost entirely unimplemented.

**Technique Bundle Settings:**

| Setting | Purpose | Status |
|---------|---------|--------|
| `spacing_multiplier` | Modify SM-2 intervals | **WORKS** |
| `retrieval_mode` | free_recall/cued/recognition | **IGNORED** |
| `interleaving_enabled` | Mix topics in sessions | **IGNORED** |
| `elaboration_prompts_enabled` | Ask for explanations | **IGNORED** |
| `reflection_prompts_enabled` | Self-reflection prompts | **IGNORED** |
| `feedback_timing` | immediate/delayed | **IGNORED** |

**Why it's broken:**
1. Settings are stored and displayed but don't modify study behavior
2. `retention_tests` table is never populated—can't measure retention
3. Web UI doesn't record `technique_bundle_id`—can't track which technique was used
4. `kc_technique_history` only populated from CLI, not web

**Impact:** The VISION.md promise—"Surface insights like 'For conceptual topics, you learn 23% faster with interleaved practice'"—is impossible to fulfill.

---

## Part 3: Frontend Expectations vs Reality

### Features That Will Never Work

| Feature | Component | Why It's Broken |
|---------|-----------|-----------------|
| **Calibration Analysis** | `CalibrationAnalysis.jsx` | Queries `confidence_before IS NOT NULL` but Web UI never collects confidence before answering |
| **Technique Comparison** | `TechniqueComparison.jsx` | Requires `technique_bundles`, `kc_technique_history`, `retention_tests`—all empty or incomplete |
| **Automatic Struggling Detection** | `ItemsNeedingAttention.jsx` | `struggling_flag` never set to TRUE |

### Fields Expected But Missing

| Field | Expected By | Actual State |
|-------|-------------|--------------|
| `source.emoji` | `SourceDetailPanel.jsx:195` | Not in schema—always uses domain fallback |
| `source_excerpt` | `KCsPanel.jsx:161` | Conditionally rendered—always NULL |
| `cognitive_level` | `KCsPanel.jsx:173` | Optional—often missing |

### Unused Response Models

`SourceResponse` and `SourceListResponse` are defined in `schemas.py` but no endpoint uses them—suggests a missing "list sources" endpoint or dead code.

---

## Part 4: Patterns Observed

### Pattern 1: Schema-First, Implementation-Never

Multiple features were designed in the database schema but never implemented in code:
- `learning_goals` — 100% unused
- `kc_subskills` — 100% unused
- `retention_tests` — table exists, never populated
- `kc_prerequisites` — extracted but stored incorrectly

### Pattern 2: Technique Bundles Are Display-Only

Bundle settings are stored and displayed in UI but don't modify actual behavior. Only `spacing_multiplier` works.

### Pattern 3: Web UI Is Significantly Less Complete Than CLI

| Capability | CLI | Web |
|------------|-----|-----|
| Spaced repetition updates | YES | **NO** |
| Confidence rating before | YES | **NO** |
| Technique bundle selection | YES | **NO** |
| Hint tracking | YES | **NO** |
| Mastery before/after | YES | **NO** |

### Pattern 4: Tracking Fields Exist But Aren't Written

15+ tracking fields in the schema are:
1. Defined in schema
2. Never written to
3. Sometimes queried (returning null/default values)

---

## Part 5: Priority Ranking

### Critical (Breaks Core Functionality)

| Issue | Impact | Fix Effort |
|-------|--------|------------|
| Web UI bypasses spaced repetition | Items never rescheduled for review | Medium |
| `next_review_at` not initialized | New KCs may never appear in due queue | Low |
| `source_excerpt` never populated | Practice items not grounded in source | Medium |

### High (Significant Feature Gaps)

| Issue | Impact | Fix Effort |
|-------|--------|------------|
| Calibration analysis broken | Feature unusable | Medium |
| Technique bundles don't modify behavior | Self-experimentation broken | High |
| Web doesn't collect confidence_before | Analytics incomplete | Low |
| Prerequisites not stored in relational table | Can't query dependencies | Medium |

### Medium (Reduced Functionality)

| Issue | Impact | Fix Effort |
|-------|--------|------------|
| Retention tests never scheduled | Can't measure long-term retention | High |
| Session context never captured | Can't analyze optimal conditions | Low |
| Hint usage not tracked | Can't analyze hint patterns | Low |
| `content_type` hardcoded | Loses document type info | Low |

### Low (Nice-to-Have)

| Issue | Impact | Fix Effort |
|-------|--------|------------|
| `learning_goals` unimplemented | Missing feature | High |
| `kc_subskills` unimplemented | Missing feature | High |
| Unused tracking fields | Missing analytics depth | Medium |
| Documentation out of date | Developer confusion | Low |

---

## Part 6: Recommended Fix Order

### Phase 1: Critical Fixes (Immediate)

1. **Fix Web UI spaced repetition** — Update `next_review_at`, `current_interval_days`, `easiness_factor` after practice
2. **Initialize `next_review_at` to NOW()** — New KCs appear in due queue immediately
3. **Add `source_excerpt` extraction** — Ground practice items in source material (COMPLETE - see M49 in `.claude/memory/milestones/sources_feature.md`)

### Phase 2: High Priority (Short-term)

4. **Add confidence collection to Web UI** — Ask before showing question
5. **Implement technique bundle effects** — Make interleaving/elaboration/reflection work
6. **Populate `kc_prerequisites` table** — Resolve names to IDs after extraction

### Phase 3: Medium Priority (Mid-term)

7. **Schedule retention tests** — Auto-create when KC reaches mastery
8. **Track session context** — `time_of_day`, `energy_level`, `focus_rating`
9. **Track hint usage properly** — `hints_viewed`, `time_before_first_hint_ms`

### Phase 4: Low Priority (Long-term)

10. **Implement learning_goals** — Full CRUD and progress tracking
11. **Implement kc_subskills** — For procedural content breakdown
12. **Update documentation** — Sync schema docs with migrations

---

## Research Artifacts

Full investigation documents available in worktrees:

| Focus Area | Path |
|------------|------|
| Schema Analysis | `/broken-process-worktrees/schema-analysis/BROKEN_INVESTIGATION.md` |
| Ingestion Audit | `/broken-process-worktrees/ingestion-audit/BROKEN_INVESTIGATION.md` |
| Practice Audit | `/broken-process-worktrees/practice-audit/BROKEN_INVESTIGATION.md` |
| API Audit | `/broken-process-worktrees/api-audit/BROKEN_INVESTIGATION.md` |
| Frontend Audit | `/broken-process-worktrees/frontend-audit/BROKEN_INVESTIGATION.md` |
| Cross-Cutting | `/broken-process-worktrees/cross-cutting/BROKEN_INVESTIGATION.md` |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total schema fields analyzed | ~100+ |
| Fields never populated | 19 |
| Tables entirely unused | 4 |
| Critical bugs discovered | 3 |
| High-priority issues | 5 |
| Features that cannot work | 3 |
