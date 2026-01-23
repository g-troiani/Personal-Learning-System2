# Memory System Index

**Last Updated:** 2026-01-23
**Total Files:** 18

## Quick Navigation

| Category | Files | Key Topics |
|----------|-------|------------|
| Milestones | 8 | M1-M51, I1-I4 implementation history |
| Decisions | 4 | Architecture, technology, patterns, memory system |
| Schemas | 3 | Database, API, React components |
| Reference | 3 | Research, context, retrospectives |

## File Summaries

### milestones/

| File | Milestones | Key Topics |
|------|------------|------------|
| `cli_foundation.md` | M1-M8 | CLI, ingestion, KC extraction, practice items, study loop, SM-2, technique bundles |
| `webui_core.md` | M9-M15, M50, M51 | React setup, home dashboard, study session, calendar, due review, progress, analytics, practice mode UI differentiation, session continuity |
| `sources_feature.md` | M16-M20, M49 | File upload, FastAPI backend, real-time processing, delete/detail panels, source-grounded practice items |
| `speed_optimization.md` | M21-M23 | Groq integration, parallel processing, retry logic, bug fixes |
| `agent_memory.md` | M24-M29 | Memory system, tiered architecture, scout subagents, EXECPLAN slimming |
| `document_reader.md` | M30-M40, M48 | PDF/Markdown/DOCX/PPTX rendering, TOC, highlights, AI chat, notes, zen mode, progress, docx-preview, PDF highlighting, LibreOffice conversion, persistent zoom preference |
| `auth_multiuser.md` | M41-M47 | Supabase Auth, JWT validation, RLS policies, data migration, deployment config, auth context, protected routes, approved users whitelist |
| `infrastructure_deployment.md` | I1-I4 | Production deployment: EC2, Docker, Nginx, SSL/TLS, Netlify, operational procedures, troubleshooting |

### decisions/

| File | Topics |
|------|--------|
| `architecture.md` | Supabase choice, hybrid CLI/web, FastAPI backend, processing status, single user |
| `technology.md` | Claude/Groq LLMs, SM-2 algorithm, React/Vite/Tailwind, ThreadPoolExecutor, Python 3.9 |
| `patterns.md` | Batch inserts, progress callbacks, retry logic, thread-safe tracking, ID generation, env config |
| `memory_system.md` | How memory works, lookup process, extraction protocol, maintenance, MemGPT pattern rationale |

### schemas/

| File | Topics |
|------|--------|
| `database.md` | Full Supabase schema (12 tables), indexes, migrations, default bundles |
| `api.md` | FastAPI endpoints, Pydantic models, processing pipeline, frontend client |
| `components.md` | React component hierarchy, custom hooks, contexts, design tokens |

### reference/

| File | Topics |
|------|--------|
| `research.md` | Learning science sources (Make It Stick, A Mind for Numbers, Ultralearning), core findings, feature mapping |
| `context.md` | Complete glossary, project structure, requirements, memory system overview |
| `retrospective.md` | Major milestone retrospectives, what worked, gaps, lessons learned |

### Project Root Analysis Documents

| File | Topics |
|------|--------|
| `UPLOAD SPEED BOTTLENECKS.md` | Pipeline analysis, bottleneck identification, implementation status (updated 2026-01-05) |
