# Architectural Decisions

**Last Updated:** 2026-01-04
**Summary:** Structural decisions for the Personal Adaptive Learning System

## Database: Supabase (PostgreSQL)

**Decision:** Use Supabase (PostgreSQL) instead of SQLite for data storage.

**Rationale:**
- User requested Supabase for cloud-hosted database with dashboard visibility
- Provides real-time data inspection, automatic backups
- Future potential for web interface (realized in M9-M15)
- Supabase Realtime enables live processing updates

**Trade-off:** Network dependency vs. offline-first design.

**Date:** 2026-01-02 (overrides initial SQLite decision)

## Hybrid CLI + Web Architecture

**Decision:** Maintain both CLI and web UI interfaces sharing the same Supabase backend.

**Rationale:**
- CLI remains functional for power users and scripting
- Web UI provides better UX for daily learning sessions
- Same database ensures data consistency across interfaces
- Enables both modes without duplicating logic

**Date:** 2026-01-02

## FastAPI for Upload Processing

**Decision:** Add FastAPI backend server for file upload processing (M18).

**Rationale:**
- Browser can't run Python ingestion pipeline directly
- FastAPI provides async request handling and background tasks
- Pydantic schemas ensure type safety for API contracts
- CORS middleware enables frontend communication

**Architecture:**
- CLI: Direct Python calls to ingestion functions
- Web: HTTP calls to FastAPI → Same ingestion functions
- Port 8001 to avoid conflicts with Vite dev server (5173)

**Date:** 2026-01-02

## Processing Status as Separate Column

**Decision:** Add `processing_status` as new column instead of using existing `status` field.

**Rationale:**
- Existing `status` field represents lifecycle state (active/archived)
- New `processing_status` tracks ingestion pipeline state (pending/extracting_kcs/generating_items/ready/error)
- These are orthogonal concerns - a source could be 'active' but 'error' in processing
- Keeping them separate avoids conflating different state machines

**Date:** 2026-01-02

## Single User Model

**Decision:** Design for single user without authentication.

**Rationale:**
- Personal learning system, not multi-tenant SaaS
- Simplifies implementation significantly
- No RLS policies needed beyond basic security
- Future: Auth can be added if needed

**Date:** Initial design

## Cross-References

- Related schemas: `schemas/database.md` (Supabase schema)
- Related technology: `decisions/technology.md` (stack choices)
- Related milestones: `milestones/sources_feature.md` (FastAPI implementation)
