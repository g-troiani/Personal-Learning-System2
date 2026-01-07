# Authentication & Multi-User Implementation Plan

**Consolidated Research from 6 Worktrees**
**Date:** 2026-01-06
**Target:** Transform single-user localhost system into secure multi-user web deployment

---

## Executive Summary

This document consolidates research from 6 parallel worktrees into a comprehensive implementation plan for adding authentication and multi-user data isolation to the Personal Adaptive Learning System.

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Supabase Auth** | Battle-tested, built-in JWT handling, automatic token refresh |
| **Email/password only** | Simplifies initial scope; OAuth can be added later |
| **RLS for data isolation** | Database-level enforcement; can't be bypassed by application bugs |
| **Stateless JWT validation** | FastAPI validates tokens; no server-side session storage |
| **Zero-downtime migration** | Phased approach preserves existing data |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                                                     │
│  ├─ AuthContext manages session state                                        │
│  ├─ ProtectedRoute guards authenticated pages                               │
│  ├─ Supabase JS client handles token storage/refresh                        │
│  └─ Auth header attached to all API calls                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  BACKEND (FastAPI)                                                           │
│  ├─ Auth middleware validates JWT from Authorization header                 │
│  ├─ get_current_user() dependency injects user into endpoints               │
│  ├─ Ownership validation before resource access                             │
│  └─ API keys (Claude/Groq) kept server-side only                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  DATABASE (Supabase PostgreSQL)                                              │
│  ├─ auth.users managed by Supabase Auth                                     │
│  ├─ user_id FK on all user-owned tables                                     │
│  ├─ RLS policies enforce data isolation                                     │
│  └─ Storage policies scope files to user folders                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Milestones

### M41: Supabase Auth Configuration

**Goal:** Configure Supabase Auth for email/password authentication

**Tasks:**
1. Enable email provider in Supabase Dashboard
2. Configure Site URL and Redirect URLs
3. Set JWT expiry to 3600 seconds (1 hour)
4. Customize email templates (signup confirmation, password reset)
5. Configure rate limits
6. Add SUPABASE_JWT_SECRET to backend environment

**Supabase Dashboard Settings:**

| Setting | Value | Location |
|---------|-------|----------|
| Site URL | `http://localhost:5173` (dev) | Auth > URL Configuration |
| Redirect URLs | `http://localhost:5173/**` | Auth > URL Configuration |
| JWT Expiry | 3600 | Auth > Settings |
| Confirm Email | ON (prod) / OFF (dev) | Auth > Providers > Email |
| Min Password Length | 8 | Auth > Providers > Email |

**Environment Variables:**

```bash
# Backend (.env)
SUPABASE_JWT_SECRET=your-jwt-secret-from-dashboard
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend (web/.env)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### M42: Database Schema Migration (Phase 1)

**Goal:** Add user_id columns to all user-owned tables (non-breaking)

**New File:** `migrations/m42_auth_schema.sql`

```sql
-- Phase 1: Add nullable user_id columns (backwards compatible)

-- Primary user-owned tables
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE knowledge_components ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE kc_state ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE kc_prerequisites ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE kc_subskills ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE practice_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE kc_technique_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE retention_tests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id filtering (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_content_sources_user_id ON content_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_components_user_id ON knowledge_components(user_id);
CREATE INDEX IF NOT EXISTS idx_kc_state_user_id ON kc_state(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_items_user_id ON practice_items(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_goals_user_id ON learning_goals(user_id);

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_sources_user_status ON content_sources(user_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_kc_state_user_review ON kc_state(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON sessions(user_id, started_at DESC);
```

**Table Classification:**

| Table | Scoping | Notes |
|-------|---------|-------|
| `technique_bundles` | SHARED | System bundles visible to all |
| `content_sources` | USER-OWNED | Documents uploaded by user |
| `knowledge_components` | USER-OWNED | Denormalized user_id for RLS performance |
| `kc_state` | USER-OWNED | Mastery tracking per user |
| `practice_items` | USER-OWNED | Generated from user's KCs |
| `sessions` | USER-OWNED | Study sessions |
| `attempts` | USER-OWNED | Practice attempts |
| `learning_goals` | USER-OWNED | User's learning objectives |

---

### M43: Backend Auth Middleware

**Goal:** Protect all API endpoints with JWT validation

**New Files:**

| File | Purpose |
|------|---------|
| `learn_system/app/api/auth/__init__.py` | Package init |
| `learn_system/app/api/auth/schemas.py` | User, TokenPayload models |
| `learn_system/app/api/auth/exceptions.py` | Auth exception classes |
| `learn_system/app/api/auth/jwt_utils.py` | JWT decoding utilities |
| `learn_system/app/api/auth/dependencies.py` | get_current_user dependency |
| `learn_system/app/api/auth/ownership.py` | Resource ownership validation |

**Key Implementation: `schemas.py`**

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TokenPayload(BaseModel):
    """Decoded JWT payload from Supabase."""
    sub: str              # User ID (UUID)
    email: Optional[str]
    role: str             # Usually "authenticated"
    aud: str              # Audience
    exp: int              # Expiration timestamp
    iat: int              # Issued at timestamp

    @property
    def user_id(self) -> str:
        return self.sub

class User(BaseModel):
    """Authenticated user injected into endpoints."""
    id: str
    email: Optional[str]
    role: str
```

**Key Implementation: `jwt_utils.py`**

```python
import jwt
from fastapi import HTTPException
from .schemas import TokenPayload
import os

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_ALGORITHM = "HS256"

def decode_jwt(token: str) -> TokenPayload:
    """Decode and validate Supabase JWT."""
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience="authenticated"
        )
        return TokenPayload(**payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")

def extract_token_from_header(auth_header: str | None) -> str:
    """Extract Bearer token from Authorization header."""
    if not auth_header:
        raise HTTPException(401, "Missing Authorization header")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(401, "Invalid Authorization header format")
    return auth_header[7:]  # Remove "Bearer " prefix
```

**Key Implementation: `dependencies.py`**

```python
from typing import Annotated, Optional
from fastapi import Depends, Header, HTTPException
from .schemas import User
from .jwt_utils import decode_jwt, extract_token_from_header

async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None
) -> User:
    """Dependency to get authenticated user. Raises 401 if invalid."""
    token = extract_token_from_header(authorization)
    payload = decode_jwt(token)
    return User(id=payload.user_id, email=payload.email, role=payload.role)

# Type alias for clean injection
CurrentUser = Annotated[User, Depends(get_current_user)]
```

**Key Implementation: `ownership.py`**

```python
from fastapi import HTTPException
from .schemas import User
from ...database.connection import get_client

class ResourceNotOwnedError(HTTPException):
    def __init__(self, resource_type: str):
        super().__init__(
            status_code=403,
            detail=f"You do not have permission to access this {resource_type}"
        )

async def validate_source_ownership(source_id: str, user: User) -> bool:
    """Validate user owns the content source. Raises 403 if not."""
    client = get_client()
    result = client.table("content_sources").select("user_id").eq("id", source_id).execute()
    if not result.data:
        raise HTTPException(404, "Source not found")
    if result.data[0].get("user_id") != user.id:
        raise ResourceNotOwnedError("source")
    return True

async def validate_session_ownership(session_id: str, user: User) -> bool:
    """Validate user owns the session. Raises 403 if not."""
    client = get_client()
    result = client.table("sessions").select("user_id").eq("id", session_id).execute()
    if not result.data:
        raise HTTPException(404, "Session not found")
    if result.data[0].get("user_id") != user.id:
        raise ResourceNotOwnedError("session")
    return True
```

**Modified Files:**

| File | Changes |
|------|---------|
| `server.py` | Add CORS expose header for X-Token-Expiring-Soon |
| `routes/sources.py` | Add CurrentUser dependency to all endpoints |
| `routes/ai.py` | Add CurrentUser dependency to all endpoints |
| `services/processing.py` | Include user_id when creating sources |

**Endpoint Protection Pattern:**

```python
from ..auth.dependencies import CurrentUser

@router.post("/upload", response_model=UploadResponse)
async def upload_source(
    current_user: CurrentUser,  # Auth required
    file: UploadFile = File(...),
):
    source_id = create_pending_source(
        filename,
        domain,
        user_id=current_user.id  # Associate with user
    )
    # ...
```

---

### M44: Frontend Auth Flow

**Goal:** Implement login, signup, password reset, and protected routes

**New Files:**

| File | Purpose |
|------|---------|
| `web/src/contexts/AuthContext.jsx` | Auth state management |
| `web/src/components/auth/AuthLayout.jsx` | Shared layout for auth pages |
| `web/src/components/auth/ProtectedRoute.jsx` | Route guard |
| `web/src/components/auth/LoginForm.jsx` | Login form |
| `web/src/components/auth/SignupForm.jsx` | Registration form |
| `web/src/components/auth/ForgotPasswordForm.jsx` | Password reset request |
| `web/src/components/auth/ResetPasswordForm.jsx` | Set new password |
| `web/src/pages/Login.jsx` | Login page |
| `web/src/pages/Signup.jsx` | Signup page |
| `web/src/pages/ForgotPassword.jsx` | Password reset page |
| `web/src/pages/ResetPassword.jsx` | New password page |

**Key Implementation: AuthContext.jsx**

```jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    if (error) throw error
  }

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    accessToken: session?.access_token,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**Key Implementation: ProtectedRoute.jsx**

```jsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../common/LoadingSpinner'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
```

**Key Implementation: LoginForm.jsx**

```jsx
import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full px-3 py-2 border rounded-md"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full px-3 py-2 border rounded-md"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>

      <div className="text-sm text-center space-y-2">
        <Link to="/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
        <p>
          Don't have an account?{' '}
          <Link to="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </form>
  )
}
```

**Modified: web/src/lib/api.js**

```javascript
import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchWithAuth(endpoint, options = {}) {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  // Check for token expiring soon
  const expiringHeader = response.headers.get('X-Token-Expiring-Soon')
  if (expiringHeader === 'true') {
    // Proactively refresh token
    await supabase.auth.refreshSession()
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid, sign out
      await supabase.auth.signOut()
      window.location.href = '/login'
      throw new Error('Session expired')
    }
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
```

**Route Configuration (App.jsx):**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import Sources from './pages/Sources'
import Study from './pages/Study'
import DocumentReader from './pages/DocumentReader'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />
          <Route path="/sources" element={
            <ProtectedRoute><Sources /></ProtectedRoute>
          } />
          <Route path="/study" element={
            <ProtectedRoute><Study /></ProtectedRoute>
          } />
          <Route path="/reader/:id" element={
            <ProtectedRoute><DocumentReader /></ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
```

---

### M45: Row-Level Security Policies

**Goal:** Enable RLS to enforce data isolation at database level

**New File:** `migrations/m45_rls_policies.sql`

```sql
-- Enable RLS on all user-owned tables
ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_subskills ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_technique_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;

-- content_sources policies
CREATE POLICY "Users can view own sources" ON content_sources
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sources" ON content_sources
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sources" ON content_sources
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own sources" ON content_sources
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- knowledge_components policies
CREATE POLICY "Users can view own KCs" ON knowledge_components
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own KCs" ON knowledge_components
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own KCs" ON knowledge_components
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own KCs" ON knowledge_components
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- kc_state policies
CREATE POLICY "Users can view own KC state" ON kc_state
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own KC state" ON kc_state
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own KC state" ON kc_state
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own KC state" ON kc_state
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- practice_items policies
CREATE POLICY "Users can view own practice items" ON practice_items
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own practice items" ON practice_items
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own practice items" ON practice_items
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own practice items" ON practice_items
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- sessions policies
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- attempts policies
CREATE POLICY "Users can view own attempts" ON attempts
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own attempts" ON attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own attempts" ON attempts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- learning_goals policies
CREATE POLICY "Users can view own goals" ON learning_goals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own goals" ON learning_goals
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- technique_bundles: users can view system bundles + own bundles
ALTER TABLE technique_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all bundles" ON technique_bundles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own bundles" ON technique_bundles
  FOR ALL TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

-- kc_prerequisites, kc_subskills policies
CREATE POLICY "Users can view own KC prerequisites" ON kc_prerequisites
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own KC prerequisites" ON kc_prerequisites
  FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view own KC subskills" ON kc_subskills
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own KC subskills" ON kc_subskills
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- kc_technique_history policies
CREATE POLICY "Users can view own technique history" ON kc_technique_history
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own technique history" ON kc_technique_history
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- retention_tests policies
CREATE POLICY "Users can view own retention tests" ON retention_tests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own retention tests" ON retention_tests
  FOR ALL TO authenticated USING (user_id = auth.uid());
```

**Storage Policies:**

```sql
-- Storage bucket policies for documents
-- Path structure: documents/{user_id}/{filename}

-- Users can only read files in their folder
CREATE POLICY "Users can read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only upload to their folder
CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only delete their own files
CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

### M46: Data Migration & Deployment

**Goal:** Migrate existing data to first user, deploy to production

**Phase 1: First User Migration**

**New File:** `learn_system/app/auth/first_user_migration.py`

```python
"""Migrate existing data to first registered user."""

from ..database.connection import get_client

async def migrate_existing_data_to_user(user_id: str):
    """
    Assign all existing orphaned data to the specified user.
    Called once after first user registration.
    """
    client = get_client()

    # Tables that need direct user_id assignment
    tables_to_migrate = [
        "content_sources",
        "knowledge_components",
        "kc_state",
        "kc_prerequisites",
        "kc_subskills",
        "practice_items",
        "sessions",
        "attempts",
        "kc_technique_history",
        "retention_tests",
        "learning_goals",
    ]

    for table in tables_to_migrate:
        try:
            client.table(table).update({
                "user_id": user_id
            }).is_("user_id", "null").execute()
        except Exception as e:
            print(f"Warning: Could not migrate {table}: {e}")

    return True


def check_is_first_user() -> bool:
    """Check if this is the first user registration."""
    client = get_client()

    # Check if any content_sources have a user_id assigned
    result = client.table("content_sources").select("id").not_.is_("user_id", "null").limit(1).execute()

    # If no sources have user_id, this is the first user
    return len(result.data) == 0
```

**Phase 2: Enforce Constraints**

**New File:** `migrations/m46_enforce_auth.sql`

```sql
-- Run AFTER first user has registered and data migrated
-- This makes authentication mandatory

-- Make user_id NOT NULL on all user-owned tables
ALTER TABLE content_sources ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE knowledge_components ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE kc_state ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE kc_prerequisites ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE kc_subskills ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE practice_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE sessions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE attempts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE kc_technique_history ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE retention_tests ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE learning_goals ALTER COLUMN user_id SET NOT NULL;
```

**Deployment Architecture:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRODUCTION ARCHITECTURE                                                     │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     FRONTEND (Vercel)                                   │  │
│  │  React + Vite SPA                                                       │  │
│  │  Environment: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL │  │
│  │  NO API KEYS (Claude/Groq are server-side only)                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
│                              ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     BACKEND API (Railway)                              │  │
│  │  FastAPI + Uvicorn                                                     │  │
│  │  Environment: SUPABASE_*, ANTHROPIC_API_KEY, GROQ_API_KEY, CORS_*     │  │
│  │  API keys NEVER exposed to frontend                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                               │
│                              ▼                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     DATABASE (Supabase)                                │  │
│  │  PostgreSQL + Auth + Storage + Realtime                                │  │
│  │  RLS policies enforce data isolation                                   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Environment Variables (Production):**

| Variable | Platform | Sensitivity |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Vercel | Public |
| `VITE_SUPABASE_ANON_KEY` | Vercel | Public |
| `VITE_API_URL` | Vercel | Public |
| `SUPABASE_URL` | Railway | Internal |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | **SECRET** |
| `SUPABASE_JWT_SECRET` | Railway | **SECRET** |
| `ANTHROPIC_API_KEY` | Railway | **SECRET** |
| `GROQ_API_KEY` | Railway | **SECRET** |
| `CORS_ORIGINS` | Railway | Internal |

---

## File Changes Summary

### New Files (19 total)

| File | Purpose |
|------|---------|
| `migrations/m42_auth_schema.sql` | Add user_id columns |
| `migrations/m45_rls_policies.sql` | RLS policies |
| `migrations/m46_enforce_auth.sql` | NOT NULL constraints |
| `learn_system/app/api/auth/__init__.py` | Package |
| `learn_system/app/api/auth/schemas.py` | User, TokenPayload |
| `learn_system/app/api/auth/exceptions.py` | Auth exceptions |
| `learn_system/app/api/auth/jwt_utils.py` | JWT validation |
| `learn_system/app/api/auth/dependencies.py` | get_current_user |
| `learn_system/app/api/auth/ownership.py` | Ownership validation |
| `learn_system/app/auth/first_user_migration.py` | Data migration |
| `web/src/contexts/AuthContext.jsx` | Auth state |
| `web/src/components/auth/AuthLayout.jsx` | Layout |
| `web/src/components/auth/ProtectedRoute.jsx` | Route guard |
| `web/src/components/auth/LoginForm.jsx` | Login |
| `web/src/components/auth/SignupForm.jsx` | Signup |
| `web/src/components/auth/ForgotPasswordForm.jsx` | Password reset request |
| `web/src/components/auth/ResetPasswordForm.jsx` | Set new password |
| `web/src/pages/Login.jsx` | Login page |
| `web/src/pages/Signup.jsx` | Signup page |

### Modified Files (7 total)

| File | Changes |
|------|---------|
| `learn_system/app/api/server.py` | CORS, auth middleware config |
| `learn_system/app/api/routes/sources.py` | Add CurrentUser dependency |
| `learn_system/app/api/routes/ai.py` | Add CurrentUser dependency |
| `learn_system/app/api/services/processing.py` | Include user_id |
| `web/src/App.jsx` | AuthProvider, routes |
| `web/src/lib/api.js` | Auth headers, token refresh |
| `web/src/components/layout/Sidebar.jsx` | Logout button |

---

## Dependencies

### Backend (Python)

| Package | Version | Purpose |
|---------|---------|---------|
| `PyJWT` | >=2.8.0 | JWT decoding and validation |

### Frontend (npm)

No new dependencies required - uses existing:
- `@supabase/supabase-js` (already installed)
- `react-router-dom` (already installed)
- `lucide-react` (already installed)

---

## Testing Checklist

### Authentication
- [ ] Sign up creates account and sends confirmation email (if enabled)
- [ ] Sign in with valid credentials succeeds
- [ ] Sign in with invalid credentials shows appropriate error
- [ ] Sign in with unconfirmed email shows appropriate message
- [ ] Password reset email sends successfully
- [ ] Password reset link works and updates password
- [ ] Logout clears session and redirects to login

### Session Management
- [ ] Session persists across page refresh (localStorage)
- [ ] Token auto-refreshes before expiry (Supabase handles)
- [ ] Expired token triggers re-authentication
- [ ] X-Token-Expiring-Soon header triggers proactive refresh

### Data Isolation
- [ ] User A cannot see User B's sources in list
- [ ] User A cannot access User B's source by direct ID (404, not 403)
- [ ] List endpoints only return authenticated user's data
- [ ] Storage files isolated by user folder path
- [ ] RLS blocks direct database access attempts

### API Protection
- [ ] All /api/* endpoints return 401 without token
- [ ] All /api/* endpoints succeed with valid token
- [ ] Invalid token format returns 401
- [ ] Expired token returns 401

### Migration
- [ ] Phase 1 migration adds columns without breaking queries
- [ ] Existing data remains accessible during transition
- [ ] First user registration triggers data migration
- [ ] All existing data assigned to first user
- [ ] Phase 2 migration enforces NOT NULL without errors

---

## Security Checklist

| Check | Description |
|-------|-------------|
| [ ] | API keys (Claude/Groq) only in backend environment |
| [ ] | SUPABASE_SERVICE_ROLE_KEY never exposed to frontend |
| [ ] | SUPABASE_JWT_SECRET never exposed to frontend |
| [ ] | CORS origins restricted to production domains |
| [ ] | RLS enabled on all user-owned tables |
| [ ] | Storage policies restrict file access by user folder |
| [ ] | Error messages don't reveal email existence on login failure |
| [ ] | Password requirements enforced (8+ characters) |
| [ ] | Rate limiting enabled on auth endpoints (Supabase default) |

---

## Known Gotchas

1. **Never use API keys as access tokens** - Use `session.access_token`, not anon key
2. **Don't modify auth schema** - Never add RLS to `auth.users` or modify its columns
3. **getSession() vs getUser()** - getSession() is fast but doesn't verify; getUser() verifies with server
4. **Service role key bypasses RLS** - Use only server-side, never expose
5. **Email tracking breaks confirmation links** - Disable tracking in SMTP provider
6. **Clock skew causes random auth failures** - Don't set JWT expiry < 1 hour
7. **Foreign keys need CASCADE** - Use `ON DELETE CASCADE` on auth.users references

---

## Rollback Plan

### Disable RLS (Emergency)

```sql
ALTER TABLE content_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_components DISABLE ROW LEVEL SECURITY;
ALTER TABLE kc_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE technique_bundles DISABLE ROW LEVEL SECURITY;
-- ... repeat for all tables
```

### Remove user_id Constraints (Partial Rollback)

```sql
ALTER TABLE content_sources ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE knowledge_components ALTER COLUMN user_id DROP NOT NULL;
-- ... repeat for all tables
```

### Remove user_id Columns (Nuclear Rollback)

```sql
DROP INDEX IF EXISTS idx_content_sources_user_id;
ALTER TABLE content_sources DROP COLUMN IF EXISTS user_id;
-- ... repeat for all tables and indexes
```

---

## Research Worktree References

Detailed research from each worktree:

| Worktree | Location | Focus |
|----------|----------|-------|
| core | `auth-worktrees/core/` | Sign-up/login flows, AuthContext, ProtectedRoute, session management |
| database | `auth-worktrees/database/` | 48 RLS policies, indexes, storage policies, table classification |
| api | `auth-worktrees/api/` | FastAPI middleware, JWT validation, ownership helpers, token refresh |
| frontend | `auth-worktrees/frontend/` | Auth UI components, forms, routing, api.js modifications |
| supabase | `auth-worktrees/supabase/` | Dashboard setup, email templates, 8 critical gotchas |
| migration | `auth-worktrees/migration/` | 4-phase migration, rollback scripts, deployment architecture |

---

## Summary

This implementation adds secure multi-user authentication to the Personal Learning System:

1. **Supabase Auth** handles signup, login, tokens, password reset
2. **FastAPI middleware** validates JWTs and injects user context
3. **RLS policies** enforce data isolation at database level
4. **Storage policies** isolate files by user folder
5. **Zero-downtime migration** preserves existing data for first user

**Total Estimated Effort:** 3-4 days

| Milestone | Effort |
|-----------|--------|
| M41: Supabase Config | 2 hours |
| M42: Schema Migration | 2 hours |
| M43: Backend Auth | 6 hours |
| M44: Frontend Auth | 6 hours |
| M45: RLS Policies | 2 hours |
| M46: Deployment | 4 hours |
| Testing & Verification | 4 hours |
