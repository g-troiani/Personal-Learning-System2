# CLI Foundation Milestones Archive

**Last Updated:** 2026-01-04
**Summary:** Implementation details for M1-M8 (core CLI, ingestion, practice, study loop, spaced repetition)

## Quick Reference

- **CLI Entry Point:** `learn_system/app/cli.py`
- **Key Commands:** init, status, sources, bundles, ingest, study, review, todo, techniques
- **Dependencies:** click, python-dotenv, python-docx, pypdf, anthropic, supabase
- **Database:** 12 tables in Supabase (content_sources, knowledge_components, practice_items, kc_state, sessions, attempts, etc.)

## Milestone Details

### Milestone 1: Project Foundation (2026-01-02)

Database schema, CLI skeleton, and configuration.

- Created virtual environment with Python 3.9
- Installed dependencies: click, python-dotenv, python-docx, pypdf, anthropic, supabase
- Created project directory structure under learn_system/
- Created database schema with 12 tables in Supabase
- Implemented CLI with commands: init, status, sources, bundles, schema
- Created 5 default technique bundles in database
- Verified all tables and bundles via Supabase dashboard

### Milestone 2: Document Ingestion (2026-01-02)

Text extraction and content storage.

- Implemented extractors for PDF, DOCX, Markdown, and plain text files
- Created ingest.py orchestration module
- Updated CLI ingest command with actual functionality
- Tested with DOCX (Make_It_Stick_Distillation.docx) and Markdown (test_document.md)
- Verified both documents stored correctly in Supabase content_sources table

### Milestone 3: Knowledge Component Extraction (2026-01-02)

LLM-based KC identification.

- Created kc_extractor.py with LLM client wrapper for Anthropic API
- Implemented content chunking for large documents (20k char limit)
- Built KC extraction prompt based on EXECPLAN.md specification
- Implemented JSON parsing with error handling for LLM responses
- Added deduplication logic to prevent duplicate KC names
- Tested with test_document.md (12 KCs) and Mind_For_Numbers (18 KCs)
- Fixed curly brace escaping issue in prompt template

### Milestone 4: Practice Item Generation (2026-01-02)

Type-specific question creation.

- Created practice/templates.py with 4 prompt templates by KC type (factual, conceptual, procedural_cognitive, procedural_execution)
- Created practice/generator.py with LLM-based item generation and JSON parsing
- Each KC generates 3 items with varying difficulty levels (1-5) and practice modes
- Practice modes: free_recall, cued_recall, recognition, explanation, application, execution
- Each item includes: prompt, expected_response, hints (2-3 progressive), rubric/success_criteria
- Updated ingest.py to call generate_all_items() after KC extraction
- Added --skip-items flag to ingest command
- Tested with test_document.md: 12 KCs generated 36 practice items
- Verified items stored correctly in Supabase practice_items table

### Milestone 5: Core Learning Loop (2026-01-02)

Session management and response collection.

- Created study/scheduler.py with get_study_queue() and get_todo_summary()
- Created study/loop.py with interactive study session implementation
- Implemented present_recall_item() for free_recall, cued_recall, recognition modes
- Implemented present_explanation_item() for explanation/application modes
- Implemented present_execution_item() for hands-on task tracking
- Session management: create session, record attempts, close with summary
- Technique history tracking integrated with attempt recording
- Connected study command to run_study_session()
- Tested: scheduler returns prioritized items, sessions/attempts recorded correctly

### Milestone 6: Spaced Repetition Engine (2026-01-02)

SM-2 scheduling and mastery tracking.

- Created state/spacing.py with SM-2 algorithm (calculate_next_review)
- Created state/estimator.py with mastery calculation (exponential moving average)
- Integrated SM-2 into study loop: updates kc_state after each attempt
- Mastery updates based on exposure count (alpha decreases over time)
- Interval calculation: perfect score -> 6 days, failed -> 1 day reset
- Easiness factor adjusts based on performance quality
- Status command shows average mastery and due counts
- Fixed datetime parsing issue for Python 3.9 compatibility
- Tested: KC state updates correctly with mastery, interval, next_review_at

### Milestone 7: To-Do Dashboard (2026-01-02)

Due items organized by source.

- Implemented todo command using get_todo_summary() from scheduler
- Shows totals: overdue, due today, new content
- Groups items by source with individual counts
- Implemented review command with source pattern matching
- Supports multiple matches with user selection
- Passes source_id to run_study_session for filtered practice
- Tested: todo shows 53 new items across 4 sources, review filters correctly

### Milestone 8: Technique Bundle Tracking (2026-01-02)

Self-experimentation foundation.

- Sessions already record technique_bundle_id on creation
- record_technique_usage tracks KC-bundle associations in kc_technique_history
- Study loop already calls record_technique_usage after each attempt
- Bundle option available on study (--bundle) and review (--bundle) commands
- Added techniques command to view bundle usage statistics
- Shows KCs practiced, total exposures, and sessions per bundle
- Foundation ready for self-experimentation and A/B testing of techniques

## Cross-References

- Related decisions: decisions/architecture.md (CLI design, single-user model)
- Related schemas: schemas/database.md (12-table schema)
- Related reference: reference/research.md (SM-2 algorithm, cognitive science basis)
