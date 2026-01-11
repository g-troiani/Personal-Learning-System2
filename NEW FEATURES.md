

     ╭─────────────────────────────────────────────────────────────────────────────╮
     │ Plan: Approved Users Whitelist for Costly API Operations                    │
     │                                                                             │
     │ Summary                                                                     │
     │                                                                             │
     │ Add an approved_users table to restrict document upload (which triggers     │
     │ expensive Claude and Groq API calls) to a whitelist of approved users.      │
     │ Non-approved users receive a 403 Forbidden error. An admin page allows      │
     │ hardcoded admin emails to manage the whitelist.                             │
     │                                                                             │
     │ Admin emails: gianmariatroiani@gmail.com, gtroiani@equilibriaconsulting.net │
     │                                                                             │
     │ ---                                                                         │
     │ Implementation Steps                                                        │
     │                                                                             │
     │ 1. Database Migration                                                       │
     │                                                                             │
     │ New file: migrations/m47_approved_users.sql                                 │
     │                                                                             │
     │ Create approved_users table:                                                │
     │ - email TEXT PRIMARY KEY (use email for pre-approving before registration)  │
     │ - user_id UUID (nullable, references auth.users)                            │
     │ - approved_by TEXT NOT NULL                                                 │
     │ - approved_at TIMESTAMPTZ                                                   │
     │ - notes TEXT                                                                │
     │                                                                             │
     │ Enable RLS with deny-all policy (service role bypasses).                    │
     │                                                                             │
     │ Seed admin emails as initial approved users.                                │
     │                                                                             │
     │ ---                                                                         │
     │ 2. Backend - Approval Logic                                                 │
     │                                                                             │
     │ New file: learn_system/app/api/auth/approval.py                             │
     │                                                                             │
     │ ADMIN_EMAILS = [                                                            │
     │     "gianmariatroiani@gmail.com",                                           │
     │     "gtroiani@equilibriaconsulting.net",                                    │
     │ ]                                                                           │
     │                                                                             │
     │ def is_user_approved(email: str) -> bool                                    │
     │ def is_admin(email: str) -> bool                                            │
     │ def require_approved_user(current_user) -> AuthenticatedUser  # raises 403  │
     │ def require_admin(current_user) -> AuthenticatedUser  # raises 403          │
     │                                                                             │
     │ Modify: learn_system/app/api/auth/__init__.py - export new functions        │
     │                                                                             │
     │ ---                                                                         │
     │ 3. Backend - Protect Upload Endpoint                                        │
     │                                                                             │
     │ Modify: learn_system/app/api/routes/sources.py                              │
     │                                                                             │
     │ Change upload_source signature:                                             │
     │ # Before                                                                    │
     │ async def upload_source(current_user: CurrentUser, ...):                    │
     │                                                                             │
     │ # After                                                                     │
     │ ApprovedUser = Annotated[AuthenticatedUser, Depends(require_approved_user)] │
     │ async def upload_source(current_user: ApprovedUser, ...):                   │
     │                                                                             │
     │ This adds approval check between JWT validation and endpoint execution.     │
     │                                                                             │
     │ ---                                                                         │
     │ 4. Backend - Admin Endpoints                                                │
     │                                                                             │
     │ New file: learn_system/app/api/routes/admin.py                              │
     │ ┌───────────────────────────────────┬────────┬──────────────────────────────│
     │ ──┐                                                                         │
     │ │             Endpoint              │ Method │          Description         │
     │   │                                                                         │
     │ ├───────────────────────────────────┼────────┼──────────────────────────────│
     │ ──┤                                                                         │
     │ │ /api/admin/check-admin            │ GET    │ Check if current user is     │
     │ admin │                                                                     │
     │ ├───────────────────────────────────┼────────┼──────────────────────────────│
     │ ──┤                                                                         │
     │ │ /api/admin/approved-users         │ GET    │ List all approved users      │
     │   │                                                                         │
     │ ├───────────────────────────────────┼────────┼──────────────────────────────│
     │ ──┤                                                                         │
     │ │ /api/admin/approved-users         │ POST   │ Add approved user            │
     │   │                                                                         │
     │ ├───────────────────────────────────┼────────┼──────────────────────────────│
     │ ──┤                                                                         │
     │ │ /api/admin/approved-users/{email} │ DELETE │ Remove approved user         │
     │   │                                                                         │
     │ └───────────────────────────────────┴────────┴──────────────────────────────│
     │ ──┘                                                                         │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │ All endpoints except check-admin require admin role.                        │
     │                                                                             │
     │ Modify: learn_system/app/api/server.py - add admin router                   │
     │                                                                             │
     │ ---                                                                         │
     │ 5. Frontend - Admin Route Guard                                             │
     │                                                                             │
     │ New file: web/src/components/auth/AdminRoute.jsx                            │
     │                                                                             │
     │ - Hardcoded ADMIN_EMAILS list                                               │
     │ - Redirects non-admins to home                                              │
     │ - Export useIsAdmin() hook for conditional UI                               │
     │                                                                             │
     │ ---                                                                         │
     │ 6. Frontend - Admin Page                                                    │
     │                                                                             │
     │ New file: web/src/pages/Admin.jsx                                           │
     │                                                                             │
     │ - Table showing approved users (email, approved_by, date, notes)            │
     │ - Form to add new approved user (email + optional notes)                    │
     │ - Remove button for each user (with confirmation)                           │
     │ - Error handling for API failures                                           │
     │                                                                             │
     │ ---                                                                         │
     │ 7. Frontend - API Functions                                                 │
     │                                                                             │
     │ Modify: web/src/lib/api.js                                                  │
     │                                                                             │
     │ Add functions:                                                              │
     │ - checkAdminStatus() - GET /api/admin/check-admin                           │
     │ - listApprovedUsers() - GET /api/admin/approved-users                       │
     │ - addApprovedUser(email, notes) - POST /api/admin/approved-users            │
     │ - removeApprovedUser(email) - DELETE /api/admin/approved-users/{email}      │
     │                                                                             │
     │ ---                                                                         │
     │ 8. Frontend - Route & Navigation                                            │
     │                                                                             │
     │ Modify: web/src/App.jsx                                                     │
     │ - Import AdminRoute and Admin page                                          │
     │ - Add route: /admin wrapped in AdminRoute                                   │
     │                                                                             │
     │ Modify: web/src/components/layout/Sidebar.jsx                               │
     │ - Import useIsAdmin hook                                                    │
     │ - Conditionally render Admin nav link with Shield icon                      │
     │                                                                             │
     │ ---                                                                         │
     │ 9. Frontend - Upload Error Handling                                         │
     │                                                                             │
     │ Modify: web/src/pages/Sources.jsx (or upload component)                     │
     │                                                                             │
     │ Handle 403 with user-friendly message:                                      │
     │ if (err.message.includes('not approved')) {                                 │
     │   setError('Your account is not approved for document uploads. Please       │
     │ contact an administrator.')                                                 │
     │ }                                                                           │
     │                                                                             │
     │ ---                                                                         │
     │ Files Changed                                                               │
     │ ┌────────────────────────────────────────┬──────────────────────────────────│
     │ ┐                                                                           │
     │ │                  File                  │              Change              │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ migrations/m47_approved_users.sql      │ New - database schema            │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ learn_system/app/api/auth/approval.py  │ New - approval logic             │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ learn_system/app/api/auth/__init__.py  │ Modify - add exports             │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ learn_system/app/api/routes/sources.py │ Modify - protect upload          │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ learn_system/app/api/routes/admin.py   │ New - admin endpoints            │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ learn_system/app/api/server.py         │ Modify - add admin router        │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ web/src/components/auth/AdminRoute.jsx │ New - route guard                │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ web/src/pages/Admin.jsx                │ New - admin page                 │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ web/src/lib/api.js                     │ Modify - add admin API functions │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ web/src/App.jsx                        │ Modify - add admin route         │
     │ │                                                                           │
     │ ├────────────────────────────────────────┼──────────────────────────────────│
     │ ┤                                                                           │
     │ │ web/src/components/layout/Sidebar.jsx  │ Modify - conditional admin link  │
     │ │                                                                           │
     │ └────────────────────────────────────────┴──────────────────────────────────│
     │ ┘                                                                           │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │                                                                             │
     │ ---                                                                         │
     │ Verification                                                                │
     │                                                                             │
     │ 1. Run migration:                                                           │
     │ -- Execute in Supabase SQL editor                                           │
     │ \i migrations/m47_approved_users.sql                                        │
     │ 2. Test non-approved user:                                                  │
     │   - Create a new Supabase account (not in approved_users)                   │
     │   - Login, try to upload a document                                         │
     │   - Expect: 403 error with clear message                                    │
     │ 3. Test approved user:                                                      │
     │   - Login as gianmariatroiani@gmail.com                                     │
     │   - Upload a document                                                       │
     │   - Expect: Success, LLM processing starts                                  │
     │ 4. Test admin page:                                                         │
     │   - Login as admin email, navigate to /admin                                │
     │   - Add a new approved user                                                 │
     │   - Remove the user                                                         │
     │   - Verify changes in database                                              │
     │ 5. Test non-admin access:                                                   │
     │   - Login as non-admin, try /admin URL directly                             │
     │   - Expect: Redirect to home                                                │
     │ 6. Build verification:                                                      │
     │ cd web && npm run build                                                     │
     │ cd ../learn_system && python -m pytest (if tests exist)        