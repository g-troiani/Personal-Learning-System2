# Authentication & Multi-User Feature - M41-M47

**Status:** Complete (2026-01-11)
**Purpose:** Transform single-user localhost system into secure multi-user web deployment with approved user whitelist

## Overview

Implements Supabase Auth for email/password authentication, Row-Level Security (RLS) for data isolation, JWT validation in FastAPI backend. Supports deployment to Vercel (frontend) + Railway (backend) + Supabase (database).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                                                     │
│  ├─ AuthContext manages session state                                        │
│  ├─ ProtectedRoute guards authenticated pages                               │
│  └─ Auth header attached to all API calls                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  BACKEND (FastAPI)                                                           │
│  ├─ Auth middleware validates JWT from Authorization header                 │
│  ├─ get_current_user() dependency injects user into endpoints               │
│  └─ API keys (Claude/Groq) kept server-side only                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATABASE (Supabase PostgreSQL)                                              │
│  ├─ auth.users managed by Supabase Auth                                     │
│  ├─ user_id FK on all user-owned tables                                     │
│  └─ RLS policies enforce data isolation                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Milestone Details

### M41: Supabase Auth Configuration (2026-01-06)

**Goal:** Supabase Auth configured for email/password with JWT settings and environment variables.

**Work Completed:**
1. Enabled email provider in Supabase Dashboard (Auth > Providers > Email)
2. Configured Site URL: `http://localhost:5173` (dev)
3. Configured Redirect URLs: `http://localhost:5173/**`
4. Set JWT expiry to 3600 seconds (1 hour)
5. Added `SUPABASE_JWT_SECRET` to backend environment
6. Added `SUPABASE_SERVICE_ROLE_KEY` to backend environment

**Verification:** Auth endpoints accessible at Supabase project URL. Environment variables set in backend.

### M42: Database Schema Migration (2026-01-06)

**Goal:** All user-owned tables have nullable user_id columns with indexes.

**Work Completed:**
1. Created `migrations/m42_auth_schema.sql`
2. Added user_id UUID column to 12 tables:
   - content_sources, knowledge_components, kc_state, kc_prerequisites
   - kc_subskills, practice_items, sessions, attempts
   - kc_technique_history, retention_tests, learning_goals, annotations
3. Created 12 single-column indexes on user_id
4. Created 8 compound indexes for query patterns
5. Ran migration on Supabase

**Verification:** `SELECT column_name FROM information_schema.columns WHERE table_name='content_sources' AND column_name='user_id'` returns row.

### M43: Backend Auth Middleware (2026-01-06)

**Goal:** All API endpoints require valid JWT and return 401 for unauthenticated requests.

**Work Completed:**
1. Added `PyJWT>=2.8.0` to requirements.txt
2. Created `learn_system/app/api/auth/` package:
   - `__init__.py`
   - `schemas.py` - CurrentUser model
   - `exceptions.py` - AuthenticationError
   - `jwt_utils.py` - decode_jwt function
   - `dependencies.py` - get_current_user dependency
   - `ownership.py` - verify_ownership helper
3. Added `CurrentUser` dependency to all routes in `sources.py` and `ai.py`
4. Updated `processing.py` to include user_id when creating sources
5. Configured CORS to expose `X-Token-Expiring-Soon` header

**Verification:** `curl http://localhost:8001/api/sources` returns 401. With valid token, returns 200.

### M44: Frontend Auth Flow (2026-01-07)

**Goal:** Users can sign up, log in, reset password, and access protected routes.

**Work Completed:**
1. Created `web/src/contexts/AuthContext.jsx` with signIn, signUp, signOut, resetPassword
2. Created `web/src/components/auth/ProtectedRoute.jsx`
3. Created auth forms:
   - `web/src/components/auth/LoginForm.jsx`
   - `web/src/components/auth/SignupForm.jsx`
   - `web/src/components/auth/ForgotPasswordForm.jsx`
   - `web/src/components/auth/ResetPasswordForm.jsx`
4. Created auth pages:
   - `web/src/pages/Login.jsx`
   - `web/src/pages/Signup.jsx`
   - `web/src/pages/ForgotPassword.jsx`
   - `web/src/pages/ResetPassword.jsx`
5. Updated `App.jsx` with AuthProvider and protected routes
6. Updated `web/src/lib/api.js` to include auth headers and handle 401
7. Added logout button to Sidebar

**Verification:** Navigate to `/` unauthenticated → redirects to `/login`. Sign up → create account. Sign in → access app.

### M45: Row-Level Security Policies (2026-01-07)

**Goal:** RLS policies enforce data isolation at database level.

**Work Completed:**
1. Created `migrations/m45_rls_policies.sql`
2. Enabled RLS on 14 tables
3. Created 46+ policies for SELECT/INSERT/UPDATE/DELETE:
   - Pattern: `auth.uid() = user_id`
   - technique_bundles: users see system bundles (user_id IS NULL) + own
4. Created 4 storage policies for documents bucket:
   - Path pattern: `documents/{user_id}/*`
5. Ran migration on Supabase

**Verification:** User A cannot SELECT rows where user_id != their UUID. Direct SQL test in Supabase.

### M46: Data Migration & Deployment (2026-01-07)

**Goal:** System deployed with first user owning all existing data.

**Work Completed:**
1. Created `learn_system/app/auth/first_user_migration.py`:
   - `check_has_orphaned_data()` - checks for rows with NULL user_id
   - `migrate_existing_data_to_user()` - assigns all orphaned data to specified user
   - `check_is_first_user()` - helper for migration logic
2. Created `migrations/m46_enforce_auth.sql`:
   - Adds NOT NULL constraints after data migration
   - Run after first user registers and migration completes
3. Created API endpoints:
   - `GET /api/migration/status` - returns orphaned data count per table
   - `POST /api/migration/trigger` - executes migration (requires service role)
4. Added CORS configuration via `CORS_ORIGINS` env var (comma-separated)
5. Deployment targets: Vercel (frontend) + Railway (backend) + Supabase (database)

**Verification:** Sign up as first user → all existing sources appear. Second user → sees empty source list.

### M47: Approved Users Whitelist (2026-01-11)

**Goal:** Restrict document upload (expensive LLM API calls) to whitelisted users. Admin page for managing whitelist.

**Work Completed:**
1. Created `migrations/m47_approved_users.sql`:
   - `approved_users` table (email PK, user_id FK, approved_by, approved_at, notes)
   - RLS enabled with deny-all (no policies = service role only)
   - Seeded with admin emails
2. Created `learn_system/app/api/auth/approval.py`:
   - `ADMIN_EMAILS` hardcoded list
   - `is_admin()` - checks if email is admin
   - `is_user_approved()` - queries approved_users table
   - `require_approved_user()` - dependency for protected endpoints
   - `require_admin()` - dependency for admin-only endpoints
   - `ApprovedUser`, `AdminUser` type aliases for dependency injection
3. Protected upload endpoint in `sources.py` with `ApprovedUser` dependency
4. Created `learn_system/app/api/routes/admin.py`:
   - `GET /api/admin/check-admin` - returns {is_admin: bool}
   - `GET /api/admin/approved-users` - list all (AdminUser)
   - `POST /api/admin/approved-users` - add user (AdminUser)
   - `DELETE /api/admin/approved-users/{email}` - remove user (AdminUser)
5. Created `web/src/components/auth/AdminRoute.jsx`:
   - `useIsAdmin()` hook checks user.email against ADMIN_EMAILS
   - `AdminRoute` component redirects non-admins to home
6. Created `web/src/pages/Admin.jsx`:
   - Table showing approved users with email, approved_by, date, notes
   - Add form with email + optional notes
   - Remove button with confirmation dialog
   - System admins show "Admin user" label (not removable)
7. Added admin API functions to `api.js`
8. Added `/admin` route to `App.jsx` wrapped in AdminRoute
9. Added conditional Admin link in Sidebar with Shield icon
10. Updated `UploadZone.jsx` to show friendly 403 message

**Admin Emails (Hardcoded):**
- gianmariatroiani@gmail.com
- gtroiani@equilibriaconsulting.net

**Key Files:**
- `migrations/m47_approved_users.sql`
- `learn_system/app/api/auth/approval.py`
- `learn_system/app/api/routes/admin.py`
- `web/src/components/auth/AdminRoute.jsx`
- `web/src/pages/Admin.jsx`
- `web/src/components/sources/UploadZone.jsx`

**Integration Testing Verified:**
1. Admin user flow: sees Admin link → /admin loads → can add/remove users
2. Non-admin user flow: no Admin link → /admin redirects to home
3. Non-approved user: upload returns 403 "Account not approved"
4. After adding to approved_users: upload succeeds (200)
5. Admin API protection: non-admin → 403 "Admin access required"

**Dependency:** Pydantic `EmailStr` requires `pip install email-validator`

**Verification:** Non-approved upload → 403. Admin can add user → user can now upload.

## Key Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Supabase Auth over custom JWT | Battle-tested, built-in refresh, already using Supabase | 2026-01-06 |
| RLS over application-level filtering | Database-level enforcement, can't bypass with app bugs | 2026-01-06 |
| Zero-downtime phased migration | Nullable columns first, auth code, data migration, then NOT NULL | 2026-01-06 |
| Vercel + Railway + Supabase deployment | Excellent Vite support, Docker for LibreOffice, existing DB | 2026-01-06 |
| Hardcoded admin list over DB role | Faster checks, no DB query, admins rarely change | 2026-01-11 |
| Deny-all RLS on approved_users | Service role bypasses, keeps whitelist hidden from users | 2026-01-11 |

## Key Files

**Backend Auth Package:**
- `learn_system/app/api/auth/__init__.py`
- `learn_system/app/api/auth/schemas.py`
- `learn_system/app/api/auth/jwt_utils.py`
- `learn_system/app/api/auth/dependencies.py`
- `learn_system/app/api/auth/ownership.py`
- `learn_system/app/auth/first_user_migration.py`

**Frontend Auth:**
- `web/src/contexts/AuthContext.jsx`
- `web/src/components/auth/ProtectedRoute.jsx`
- `web/src/components/auth/LoginForm.jsx`
- `web/src/components/auth/SignupForm.jsx`
- `web/src/pages/Login.jsx`, `Signup.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`

**Migrations:**
- `migrations/m42_auth_schema.sql` - user_id columns
- `migrations/m45_rls_policies.sql` - RLS policies
- `migrations/m46_enforce_auth.sql` - NOT NULL constraints

## Surprises and Discoveries

- Never use API keys as access tokens - use `session.access_token`, not anon key
- Don't modify auth schema - never add RLS to `auth.users` or modify its columns
- getSession() is fast but doesn't verify; getUser() verifies with server
- Service role key bypasses RLS - use only server-side, never expose
- Email tracking breaks confirmation links - disable tracking in SMTP provider
- Clock skew causes random auth failures - don't set JWT expiry < 1 hour
- Foreign keys need `ON DELETE CASCADE` on auth.users references
- Not all tables have `id` column (kc_state, kc_prerequisites use composite keys)
- Auth token stored in localStorage as `sb-{project-ref}-auth-token`
- Migration endpoint requires service role key (bypasses RLS)

## RLS/Display Bug Fix (2026-01-07)

**Root Cause Analysis:**
- practice_items RLS policy had complex nested EXISTS that failed silently
- migration.py endpoints double-filtered on user_id (redundant)
- api.js hardcoded wrong port (8000 vs 8001)

**Fixes Applied:**
1. `fix_practice_items_rls.sql` simplified policy to `auth.uid() = user_id OR user_id IS NULL`
2. Removed redundant `.eq('user_id')` from migration.py (lines 36, 56, 94)
3. Updated useSources.js and Study.jsx to use direct Supabase queries
4. Fixed API_BASE port in api.js

**Regression Test:** All pages verified functional - Sources, Study, Due for Review, Progress, Analytics.

## Cross-References

- `schemas/database.md` - user_id columns and indexes
- `schemas/api.md` - auth middleware, protected endpoints
- `schemas/components.md` - AuthContext, ProtectedRoute
- `decisions/architecture.md` - deployment strategy
