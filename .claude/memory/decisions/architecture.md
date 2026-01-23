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

## Multi-User Authentication (M41-M47)

**Decision:** Transform single-user localhost system into secure multi-user web deployment using Supabase Auth.

**Rationale:**
- Battle-tested JWT handling with automatic token refresh
- Email/password first, OAuth can be added later
- Built-in password reset, email confirmation flows
- Reduces security surface area vs custom implementation

**Date:** 2026-01-06 (overrides initial single-user decision)

## Row-Level Security (RLS)

**Decision:** Use RLS for data isolation instead of application-level filtering.

**Rationale:**
- Database-level enforcement - can't be bypassed by application bugs
- Works with direct database access (Supabase client)
- auth.uid() function provides user context automatically
- 46+ policies across 14 user-owned tables
- Storage policies use same pattern for file isolation

**Date:** 2026-01-06

## Zero-Downtime Migration

**Decision:** Phased migration approach for adding auth to existing system.

**Rationale:**
1. Phase 1: Add nullable user_id columns (non-breaking)
2. Phase 2: Deploy auth code (backwards compatible)
3. Phase 3: Migrate existing data to first user
4. Phase 4: Enforce NOT NULL + RLS (breaking for unauthenticated)
Each phase has rollback scripts.

**Date:** 2026-01-06

## Deployment Target

**Decision:** Deploy to Vercel (frontend) + Railway (backend) + Supabase (database).

**Rationale:**
- Vercel has excellent Vite support with free tier
- Railway supports Docker for LibreOffice container
- Supabase already in use for database
- API keys (Claude/Groq) only in Railway environment - never exposed to frontend

**Date:** 2026-01-06

## Document Reader Integration

**Decision:** Document Reader uses existing Sidebar with conditional TOC section.

**Rationale:**
- Reuses existing UI patterns
- Avoids redundant navigation
- TOC in teal color differentiates from nav items

**Date:** 2026-01-05

## File Storage

**Decision:** Store uploaded files in Supabase Storage, not blob columns.

**Rationale:**
- CDN delivery
- Signed URLs with expiry
- Separate storage from database
- 50MB file limit

**Date:** 2026-01-05

## Cross-References

- Related schemas: `schemas/database.md` (Supabase schema)
- Related technology: `decisions/technology.md` (stack choices)
- Related milestones: `milestones/sources_feature.md` (FastAPI implementation)
