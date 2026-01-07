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

---

## Calendar Improvement: System Integration and Navigation

### Current State Summary

The Calendar page exists as a standalone view for scheduling future study sessions, but it operates in isolation from the rest of the application. Users must manually navigate to different views to understand their learning schedule, and completing a study session does not trigger any updates in the calendar view.

### Problems Identified

- **Disconnected OverdueAlert**: Home page shows overdue count but links to incorrect route `/due-for-review` (should be `/review`)
- **No calendar link from Home**: Dashboard Quick Stats show "Due Today" and "Overdue" counts but don't link to Calendar
- **Calendar shows sessions only**: Current Calendar page only displays scheduled/completed `sessions` records, not the actual due items from `kc_state.next_review_at`
- **DueForReview and Calendar are parallel**: Both show "what to study" but in completely different formats with no cross-linking
- **No state synchronization**: Completing a study session doesn't invalidate/refresh Calendar or Home page data
- **Sidebar badge on wrong item**: Due count badge is on "Due for Review" nav item, not on Calendar
- **No deep linking**: Cannot share a URL like `/calendar?date=2026-01-15` to jump to specific day
- **No "Today" unified view**: Users must check Home (stats) + Calendar (schedule) + DueForReview (item list) separately

### Navigation Flow Diagram

```
CURRENT STATE (Fragmented):

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Home ─────────── OverdueAlert ─────────► /due-for-review (BROKEN!)        │
│     │                                                                       │
│     │              Quick Stats                                              │
│     │              ├─ Due Today: 5      (no link)                          │
│     │              └─ Overdue: 3        (no link)                          │
│     │                                                                       │
│     └──────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Calendar ────────── Shows sessions only (not KC due dates)               │
│                       No connection to DueForReview or Study                │
│                                                                             │
│   DueForReview ────── Shows due items by source                            │
│                       "Study All" button → /study                          │
│                                                                             │
│   Study ──────────────────────────────────────────────────────────────────►│
│               Session ends → navigate('/') or handleStudyMore()            │
│               NO refresh of Calendar/Home data                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

PROPOSED STATE (Integrated):

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   Home                                                                      │
│     │                                                                       │
│     ├─ OverdueAlert ──────────────────────► /calendar?view=today           │
│     │                                                                       │
│     ├─ Quick Stats (clickable)                                             │
│     │   ├─ Due Today: 5 ──────────────────► /calendar?view=today           │
│     │   ├─ Overdue: 3 ────────────────────► /calendar?view=overdue         │
│     │   └─ New: 12 ───────────────────────► /review                        │
│     │                                                                       │
│     └─ TodayPreview card ─────────────────► /calendar?view=today           │
│                                                                             │
│   Sidebar                                                                   │
│     ├─ Calendar [5] ◄──────────────────────  Badge shows TODAY's count     │
│     └─ Due for Review ◄────────────────────  Badge shows OVERDUE count     │
│                                                                             │
│   Calendar (Central Hub)                                                    │
│     ├─ ?view=today ────────► Today panel: due KCs + scheduled sessions     │
│     ├─ ?view=overdue ──────► Overdue panel: all overdue KCs grouped        │
│     ├─ ?date=2026-01-15 ───► Jump to specific date                         │
│     └─ Click KC ───────────► /study?kc={id} or /study?source={id}          │
│                                                                             │
│   Study                                                                     │
│     │                                                                       │
│     └─ Session ends ─────────► calendarRefreshTrigger++ in context         │
│                                Home/Calendar useEffect re-fetches          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components to Modify

| Component | File | Changes |
|-----------|------|---------|
| **OverdueAlert** | `web/src/components/home/OverdueAlert.jsx` | Fix route from `/due-for-review` to `/calendar?view=today` |
| **Sidebar** | `web/src/components/layout/Sidebar.jsx` | Move badge to Calendar nav item (today's due count) |
| **Home** | `web/src/pages/Home.jsx` | Add clickable Quick Stats linking to Calendar views |
| **Calendar** | `web/src/pages/Calendar.jsx` | Add query param handling, fetch KC due dates, show TodayPanel |
| **App** | `web/src/App.jsx` | No route changes needed (Calendar already at `/calendar`) |
| **SupabaseContext** | `web/src/contexts/SupabaseContext.jsx` | Add `refreshTrigger` state + increment function |
| **Study** | `web/src/pages/Study.jsx` | Call context refresh trigger after session ends |

### URL Routing Additions

No new routes needed. Calendar accepts query parameters:

| URL | Behavior |
|-----|----------|
| `/calendar` | Default month view, today selected |
| `/calendar?view=today` | Month view with expanded "Today" panel showing all due KCs |
| `/calendar?view=overdue` | Month view with expanded "Overdue" panel showing all overdue KCs |
| `/calendar?date=2026-01-15` | Jump to that date, select it, show its details |

**Implementation:**

```javascript
// Calendar.jsx - Add at top of component
const [searchParams] = useSearchParams()
const viewParam = searchParams.get('view') // 'today' | 'overdue' | null
const dateParam = searchParams.get('date') // '2026-01-15' | null

useEffect(() => {
  if (dateParam) {
    const targetDate = new Date(dateParam)
    setSelectedDate(targetDate)
    setCurrentDate(targetDate) // Navigate month view to that date
  }
  if (viewParam === 'today') {
    setSelectedDate(new Date())
    setShowTodayPanel(true)
  } else if (viewParam === 'overdue') {
    setShowOverduePanel(true)
  }
}, [dateParam, viewParam])
```

### State Synchronization Strategy

**Problem:** When Study completes, Calendar/Home show stale data until page refresh.

**Solution:** Add a `refreshTrigger` counter in SupabaseContext that components subscribe to.

**SupabaseContext.jsx additions:**

```javascript
// Add to state
const [refreshTrigger, setRefreshTrigger] = useState(0)

// Add to value
const triggerDataRefresh = useCallback(() => {
  setRefreshTrigger(prev => prev + 1)
}, [])

const value = {
  // ... existing
  refreshTrigger,
  triggerDataRefresh,
}
```

**Study.jsx modification:**

```javascript
const { triggerDataRefresh } = useSupabase()

// In endSession function, after updating session:
const endSession = async () => {
  // ... existing session update code ...

  // Trigger global data refresh for Calendar/Home
  triggerDataRefresh()

  setShowSummary(true)
}
```

**Calendar.jsx subscription:**

```javascript
const { refreshTrigger, getDueCounts } = useSupabase()

// Re-fetch when trigger changes
useEffect(() => {
  fetchScheduledSessions()
  fetchDueKCs() // New function to get KC due dates
}, [supabase, currentDate, refreshTrigger])
```

**Home.jsx subscription:**

```javascript
const { refreshTrigger } = useSupabase()

useEffect(() => {
  const fetchData = async () => {
    await fetchSources()
    const [dueData, masteryData] = await Promise.all([
      getDueCounts(),
      getMasteryBySource()
    ])
    setDueCounts(dueData)
    setMasteryBySource(masteryData)
    setDataLoaded(true)
  }
  fetchData()
}, [refreshTrigger]) // Add refreshTrigger dependency
```

### New Calendar Features Required

1. **Fetch KC Due Dates**: Query `kc_state` for items where `next_review_at` falls within displayed month
2. **TodayPanel Component**: Shows due KCs for today with "Start Studying" button
3. **OverduePanel Component**: Shows all overdue KCs grouped by source
4. **Calendar dots**: Show dots on calendar days that have due items (not just sessions)

**New query for Calendar:**

```javascript
const fetchDueKCs = async () => {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

  const { data, error } = await supabase
    .from('kc_state')
    .select(`
      kc_id,
      next_review_at,
      mastery_level,
      knowledge_components!inner(name, source_id, content_sources(title))
    `)
    .gte('next_review_at', firstDay.toISOString())
    .lte('next_review_at', lastDay.toISOString())

  if (!error) {
    setDueKCs(data || [])
  }
}
```

### Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| 1 | Fix OverdueAlert route (`/review` not `/due-for-review`) | 5 min |
| 2 | Add refreshTrigger to SupabaseContext | 15 min |
| 3 | Wire Study.jsx to call triggerDataRefresh | 10 min |
| 4 | Add query param handling to Calendar | 30 min |
| 5 | Add KC due date fetching to Calendar | 45 min |
| 6 | Create TodayPanel component | 1 hour |
| 7 | Make Home Quick Stats clickable | 30 min |
| 8 | Move Sidebar badge to Calendar item | 15 min |
| **Total** | | ~3.5 hours |

### Files to Create

| File | Purpose |
|------|---------|
| `web/src/components/calendar/TodayPanel.jsx` | Shows today's due KCs with study buttons |
| `web/src/components/calendar/OverduePanel.jsx` | Shows all overdue KCs grouped by source |
| `web/src/components/calendar/DayDot.jsx` | Visual indicator for days with due items |

### Testing Checklist

- [ ] OverdueAlert "Review now" button navigates to `/calendar?view=today`
- [ ] Home Quick Stats are clickable and link correctly
- [ ] Calendar accepts `?view=today`, `?view=overdue`, `?date=YYYY-MM-DD` params
- [ ] Calendar shows dots on days with due KCs
- [ ] TodayPanel shows correct count of due items
- [ ] Clicking "Study" in TodayPanel navigates to `/study`
- [ ] Completing a study session refreshes Calendar view
- [ ] Completing a study session refreshes Home Quick Stats
- [ ] Sidebar Calendar badge shows today's due count
- [ ] Sidebar Due for Review badge shows overdue count
- [ ] Deep linking: sharing `/calendar?date=2026-01-15` works correctly

---

## Calendar Improvement: Data Model and State Management

**Current State:** The calendar view displays sessions by `started_at` timestamp but lacks integration with spaced repetition due dates from `kc_state.next_review_at`. CalendarGrid.jsx incorrectly references a non-existent `scheduled_for` field.

### Problems Identified

- **`sessions` table has no `scheduled_for` field** - CalendarGrid.jsx line 32 references `s.scheduled_for` which does not exist in the schema
- **Scheduling creates sessions with `started_at` set to future dates** - Conflates "when session began" with "when session was planned for"
- **Calendar ignores due items from kc_state** - Does not aggregate `kc_state.next_review_at` by day for display
- **No distinction between scheduled vs started sessions** - Using `ended_at IS NULL` as a proxy is fragile
- **No caching strategy** - Fetches sessions on every month navigation without caching
- **No real-time updates** - Due items crossing into "overdue" at midnight are not reflected

### Database Schema Changes

**Migration: `migrations/calendar_schema.sql`**

```sql
-- Add scheduled_for to sessions (distinct from started_at)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

-- Index for calendar queries
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_for ON sessions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sessions_user_scheduled ON sessions(user_id, scheduled_for);

-- View for due items aggregated by date (for calendar display)
CREATE OR REPLACE VIEW calendar_due_items AS
SELECT
    DATE(next_review_at) AS due_date,
    user_id,
    COUNT(*) AS due_count,
    SUM(CASE WHEN next_review_at < NOW() THEN 1 ELSE 0 END) AS overdue_count,
    SUM(CASE WHEN next_review_at >= NOW() AND next_review_at < NOW() + INTERVAL '1 day' THEN 1 ELSE 0 END) AS due_today_count
FROM kc_state
WHERE next_review_at IS NOT NULL
GROUP BY DATE(next_review_at), user_id;

-- RLS policy for the view (if needed as a table instead of view)
-- Views inherit RLS from underlying tables, so this works automatically
```

**Session State Clarification:**

| Field | Meaning |
|-------|---------|
| `scheduled_for` | When user planned to study (NULL = unscheduled session) |
| `started_at` | When session actually began (set when user starts) |
| `ended_at` | When session ended (NULL = in progress or not started) |

**Session States:**

| State | scheduled_for | started_at | ended_at |
|-------|---------------|------------|----------|
| Scheduled (future) | date | NULL | NULL |
| In Progress | date or NULL | timestamp | NULL |
| Completed | date or NULL | timestamp | timestamp |

### React State/Hook Structure

**New File: `web/src/hooks/useCalendarData.js`**

```javascript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

/**
 * Hook for calendar data management with caching and real-time updates
 *
 * @param {Date} currentMonth - Month to display
 * @returns {Object} Calendar data and methods
 */
export function useCalendarData(currentMonth) {
  const { supabase } = useSupabase()

  // State
  const [sessions, setSessions] = useState([])
  const [dueItemsByDate, setDueItemsByDate] = useState({}) // { 'YYYY-MM-DD': { due: N, overdue: N } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cache: Map<'YYYY-MM', { sessions, dueItems, fetchedAt }>
  const cache = useRef(new Map())
  const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

  // Generate cache key from month
  const getCacheKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }

  // Get month boundaries
  const getMonthRange = (date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return { firstDay, lastDay }
  }

  // Fetch sessions for month
  const fetchSessions = async (firstDay, lastDay) => {
    // Query sessions that are:
    // 1. Scheduled for this month (scheduled_for in range)
    // 2. OR started this month but unscheduled (started_at in range, scheduled_for IS NULL)
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .or(`and(scheduled_for.gte.${firstDay.toISOString()},scheduled_for.lte.${lastDay.toISOString()}),and(scheduled_for.is.null,started_at.gte.${firstDay.toISOString()},started_at.lte.${lastDay.toISOString()})`)
      .order('scheduled_for', { ascending: true, nullsFirst: false })

    if (error) throw error
    return data || []
  }

  // Fetch due items aggregated by date
  const fetchDueItems = async (firstDay, lastDay) => {
    // Get all KC states with next_review_at in this month
    const { data, error } = await supabase
      .from('kc_state')
      .select('kc_id, next_review_at')
      .gte('next_review_at', firstDay.toISOString())
      .lte('next_review_at', lastDay.toISOString())

    if (error) throw error

    // Aggregate by date
    const byDate = {}
    const now = new Date()

    data?.forEach(item => {
      const reviewDate = new Date(item.next_review_at)
      const dateKey = reviewDate.toISOString().split('T')[0] // 'YYYY-MM-DD'

      if (!byDate[dateKey]) {
        byDate[dateKey] = { due: 0, overdue: 0 }
      }

      byDate[dateKey].due++
      if (reviewDate < now) {
        byDate[dateKey].overdue++
      }
    })

    return byDate
  }

  // Main fetch function with caching
  const fetchCalendarData = useCallback(async (forceRefresh = false) => {
    const cacheKey = getCacheKey(currentMonth)
    const cached = cache.current.get(cacheKey)

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && cached && (Date.now() - cached.fetchedAt < CACHE_TTL_MS)) {
      setSessions(cached.sessions)
      setDueItemsByDate(cached.dueItems)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { firstDay, lastDay } = getMonthRange(currentMonth)

      // Fetch in parallel
      const [sessionsData, dueItemsData] = await Promise.all([
        fetchSessions(firstDay, lastDay),
        fetchDueItems(firstDay, lastDay)
      ])

      // Update cache
      cache.current.set(cacheKey, {
        sessions: sessionsData,
        dueItems: dueItemsData,
        fetchedAt: Date.now()
      })

      setSessions(sessionsData)
      setDueItemsByDate(dueItemsData)
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [currentMonth, supabase])

  // Initial fetch and refetch on month change
  useEffect(() => {
    fetchCalendarData()
  }, [fetchCalendarData])

  // Real-time subscription for kc_state changes
  useEffect(() => {
    const channel = supabase
      .channel('calendar-due-items')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kc_state',
          filter: 'next_review_at=neq.null'
        },
        (payload) => {
          // Invalidate cache and refetch
          cache.current.clear()
          fetchCalendarData(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchCalendarData])

  // Get data for a specific day
  const getDataForDay = useCallback((day) => {
    const dateKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    const daySessions = sessions.filter(s => {
      const sessionDate = s.scheduled_for || s.started_at
      return sessionDate?.startsWith(dateKey)
    })

    const dueData = dueItemsByDate[dateKey] || { due: 0, overdue: 0 }

    return {
      sessions: daySessions,
      dueCount: dueData.due,
      overdueCount: dueData.overdue,
      hasActivity: daySessions.length > 0 || dueData.due > 0
    }
  }, [sessions, dueItemsByDate, currentMonth])

  // Schedule a new session
  const scheduleSession = useCallback(async (sessionData) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id: `sess_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`,
        session_type: sessionData.session_type,
        scheduled_for: sessionData.scheduled_for, // Use scheduled_for, not started_at
        target_duration_minutes: sessionData.duration_minutes,
        // started_at is NULL until session actually starts
      })
      .select()
      .single()

    if (error) throw error

    // Update local state
    setSessions(prev => [...prev, data])

    // Invalidate cache for this month
    cache.current.delete(getCacheKey(currentMonth))

    return data
  }, [supabase, currentMonth])

  // Invalidate cache (for external triggers)
  const invalidateCache = useCallback(() => {
    cache.current.clear()
    fetchCalendarData(true)
  }, [fetchCalendarData])

  return {
    sessions,
    dueItemsByDate,
    loading,
    error,
    getDataForDay,
    scheduleSession,
    invalidateCache,
    refetch: () => fetchCalendarData(true)
  }
}
```

### Updated CalendarGrid Component

**Key changes to `CalendarGrid.jsx`:**

```javascript
// Before: references non-existent scheduled_for
const getSessionsForDay = (day) => {
  return scheduledSessions.filter(s => s.scheduled_for?.startsWith(dateStr))
}

// After: uses hook's getDataForDay
export default function CalendarGrid({ currentDate, selectedDate, onSelectDate, calendarData }) {
  // ...
  const dayData = calendarData.getDataForDay(day)
  const hasSession = dayData.sessions.length > 0
  const hasDueItems = dayData.dueCount > 0
  const hasOverdue = dayData.overdueCount > 0

  return (
    <button /* ... */>
      {day}
      {/* Session indicator */}
      {hasSession && (
        <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-accent-progress rounded-full" />
      )}
      {/* Due items indicator */}
      {hasDueItems && !hasSession && (
        <span className={`absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${hasOverdue ? 'bg-accent-alert' : 'bg-accent-info'}`} />
      )}
    </button>
  )
}
```

### Data Fetching Queries (Supabase Syntax)

**Fetch sessions for month:**
```javascript
const { data } = await supabase
  .from('sessions')
  .select('*')
  .or(`scheduled_for.gte.${firstDay},scheduled_for.lte.${lastDay}`)
  .order('scheduled_for', { ascending: true })
```

**Fetch due items for month:**
```javascript
const { data } = await supabase
  .from('kc_state')
  .select('kc_id, next_review_at')
  .gte('next_review_at', firstDay.toISOString())
  .lte('next_review_at', lastDay.toISOString())
```

**Count due items for today (dashboard widget):**
```javascript
const { count } = await supabase
  .from('kc_state')
  .select('*', { count: 'exact', head: true })
  .lte('next_review_at', new Date().toISOString())
```

### Caching and Optimization Strategy

| Strategy | Implementation |
|----------|----------------|
| **Month-level cache** | Cache key: `YYYY-MM`, TTL: 5 minutes |
| **Parallel fetching** | Fetch sessions + due items simultaneously via `Promise.all` |
| **Optimistic updates** | Add scheduled session to local state before server confirms |
| **Real-time invalidation** | Subscribe to `kc_state` changes, clear cache on update |
| **Stale-while-revalidate** | Show cached data immediately, fetch fresh in background |
| **Preload adjacent months** | On mount, prefetch prev/next month in background |

**Cache structure:**
```javascript
// useRef Map in useCalendarData hook
cache = Map<'YYYY-MM', {
  sessions: Session[],
  dueItems: { [date: string]: { due: number, overdue: number } },
  fetchedAt: number // timestamp for TTL check
}>
```

### Real-Time Updates

**Subscription for due item updates:**
```javascript
supabase
  .channel('calendar-due-items')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'kc_state',
    filter: 'next_review_at=neq.null'
  }, () => {
    invalidateCache()
  })
  .subscribe()
```

**Midnight boundary handling:**
```javascript
// In useCalendarData, set up a timer to refresh at midnight
useEffect(() => {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  const msUntilMidnight = midnight - now

  const timer = setTimeout(() => {
    invalidateCache() // Items become overdue at midnight
  }, msUntilMidnight)

  return () => clearTimeout(timer)
}, [invalidateCache])
```

### Implementation Checklist

- [ ] Run migration to add `scheduled_for` column to sessions
- [ ] Update ScheduleForm to use `scheduled_for` instead of `started_at`
- [ ] Create `useCalendarData` hook with caching
- [ ] Update Calendar.jsx to use new hook
- [ ] Update CalendarGrid.jsx to accept `calendarData` prop
- [ ] Add due items indicators (different color from sessions)
- [ ] Set up real-time subscription for kc_state changes
- [ ] Add midnight timer for overdue refresh
- [ ] Test with existing sessions (backward compatible)

### Estimated Effort

| Task | Time |
|------|------|
| Schema migration | 30 min |
| useCalendarData hook | 2 hours |
| Component updates | 1 hour |
| Real-time + caching | 1 hour |
| Testing | 1 hour |
| **Total** | **5.5 hours**

---

# Sources View & RLS Fix Research

**Research Date:** 2026-01-07
**Method:** 10 parallel research agents
**Status:** Research Complete - Ready for Implementation

---

## Executive Summary

Research identified two critical bugs and one security issue that must be addressed:

1. **CRITICAL:** practice_items RLS policy blocks all SELECTs (workaround currently in place)
2. **CRITICAL:** Study page shows "No items to study" due to redundant user_id filtering
3. **SOURCES VIEW:** Already fully implemented (M16-M20) - no placeholder exists

> **Note:** Security scan found .env files with credentials, but they are correctly gitignored and not tracked. No credential rotation needed.

---

## Part 1: Critical Bug - Practice Items RLS

### Problem Statement

The practice_items table has RLS enabled with a policy that should work:
```sql
USING (auth.uid() = user_id OR user_id IS NULL)
```

But all SELECT queries return 0 rows even though:
- All 117 rows have correct user_id matching the authenticated user
- The identical policy works on kc_state and knowledge_components tables

### Current Workaround

`useSources.js` (lines 47-63) bypasses RLS via backend API:
```javascript
// Fetch practice items via backend API (bypasses RLS issue)
// TODO: Fix RLS policy on practice_items table and revert to direct Supabase query
const response = await fetch('http://localhost:8001/api/migration/all-practice-items', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

### Diagnostic Steps

Run these queries in Supabase SQL Editor as an authenticated user:

```sql
-- 1. Check what auth.uid() returns
SELECT auth.uid() as current_user_id;

-- 2. Check if practice_items exist with your user_id
SELECT COUNT(*) as total,
       COUNT(CASE WHEN user_id = auth.uid() THEN 1 END) as matching_user_id
FROM practice_items;

-- 3. Check the actual policy definition
SELECT polname, polcmd, polqual::text
FROM pg_policies
WHERE tablename = 'practice_items' AND polname LIKE '%view%';

-- 4. Test direct SELECT (this is what's failing)
SELECT id FROM practice_items LIMIT 5;

-- 5. Compare with a table that works
SELECT id FROM knowledge_components LIMIT 5;
```

### Root Cause Hypothesis

The M45 policy for practice_items uses an indirect ownership check via knowledge_components:
```sql
USING (
    auth.uid() = user_id
    OR user_id IS NULL
    OR EXISTS (
        SELECT 1 FROM knowledge_components
        WHERE knowledge_components.id = practice_items.kc_id
        AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
    )
)
```

This complex nested query may have performance issues or subtle evaluation bugs.

### Fix: Apply Simplified Policy

The file `migrations/fix_practice_items_rls.sql` already exists with the fix:

```sql
-- Drop and recreate with simpler policy
DROP POLICY IF EXISTS "Users can view own practice items" ON practice_items;

CREATE POLICY "Users can view own practice items"
    ON practice_items FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);
```

**Steps:**
1. Run `migrations/fix_practice_items_rls.sql` in Supabase SQL Editor
2. Verify with: `SELECT COUNT(*) FROM practice_items;` (should return 117)
3. If successful, remove workaround from `useSources.js` lines 47-63

### Verification

After applying fix, test from frontend:
```javascript
const { data, error } = await supabase
  .from('practice_items')
  .select('id')
  .limit(5)

console.log('Count:', data?.length, 'Error:', error)
// Expected: Count: 5, Error: null
```

---

## Part 2: Critical Bug - Study Page "No Items"

### Problem Statement

Study page shows "No items to study. Try adding some documents first!" even when 40+ practice items exist and should be available for study.

### Root Cause

File: `learn_system/app/api/routes/migration.py` lines 87 (and similar at 36, 56)

The query applies TWO user_id filters:
```python
# Step 1: Get KCs filtered by user_id ✓
kcs_result = client.table('knowledge_components').select(...).eq('user_id', current_user.id)
kc_ids = [kc['id'] for kc in kcs_result.data]

# Step 2: Get practice items with DOUBLE filter ✗
items_result = client.table('practice_items').select('*').in_('kc_id', kc_ids).eq('user_id', current_user.id)
```

**The problem:** If practice_items have `user_id = NULL` (orphaned data from before M46), the second `.eq('user_id', current_user.id)` filter excludes them, even though they belong to the user's KCs.

### Fix

The KC ownership check is sufficient security - remove the redundant user_id filter:

**File:** `learn_system/app/api/routes/migration.py`

| Line | Before | After |
|------|--------|-------|
| 36 | `.eq('user_id', current_user.id)` | (remove) |
| 56 | `.eq('user_id', current_user.id)` | (remove) |
| 87 | `.eq('user_id', current_user.id)` | (remove) |

**Example fix for line 87:**
```python
# BEFORE (broken)
items_result = client.table('practice_items').select('*').in_('kc_id', kc_ids).eq('user_id', current_user.id).limit(limit).execute()

# AFTER (fixed)
items_result = client.table('practice_items').select('*').in_('kc_id', kc_ids).limit(limit).execute()
```

### Alternative: Fix Data Instead of Code

If keeping the user_id filter is preferred for defense-in-depth, ensure all practice_items have user_id set:

```sql
-- Backfill NULL user_ids from parent KC
UPDATE practice_items pi
SET user_id = kc.user_id
FROM knowledge_components kc
WHERE pi.kc_id = kc.id AND pi.user_id IS NULL;

-- Verify
SELECT COUNT(*) FROM practice_items WHERE user_id IS NULL;
-- Should return 0
```

---

## Part 3: Sources View Architecture (Reference)

The Sources view is **already fully implemented** through M16-M20. This section documents its architecture.

### Component Hierarchy

```
Sources.jsx (Page Controller)
├── SourcesHeader.jsx          - Title + source count
├── SourcesToolbar.jsx         - Search, filter, sort, "Add" button
├── UploadZone.jsx            - Drag-drop upload with progress
│   └── UploadProgress        - Step indicators (Extract→Analyze→Generate)
├── EmptyState.jsx            - Onboarding when no sources
├── SourcesList.jsx           - Responsive grid of cards
│   └── SourceCard.jsx        - Individual source with stats
│       ├── Domain badge + emoji
│       ├── Processing status
│       ├── Mastery progress bar
│       ├── Due counts (overdue/due/new)
│       └── Actions (Read, Practice, Menu)
├── SourceDetailPanel.jsx     - Slide-out panel with KC list
└── ConfirmationDialog.jsx    - Delete confirmation
```

### Data Flow

```
┌──────────────────────────────────────────────────────────────┐
│ useSources() Hook - Central Data Management                   │
├──────────────────────────────────────────────────────────────┤
│ 1. Fetch content_sources from Supabase                       │
│ 2. Fetch knowledge_components from Supabase                  │
│ 3. Fetch practice_items via backend API (RLS workaround)     │
│ 4. Fetch kc_state from Supabase                              │
│ 5. Compute enrichments per source:                           │
│    - kcCount: # of KCs                                       │
│    - itemCount: # of practice items                          │
│    - mastery: avg mastery %                                  │
│    - overdueCount, dueCount, newCount                        │
│ 6. Apply filters (search, domain) and sort (date/name/mastery)│
│ 7. Return: { sources, allSources, loading, error, refresh }  │
└──────────────────────────────────────────────────────────────┘
```

### Upload Pipeline

| Stage | Status | Progress | Duration |
|-------|--------|----------|----------|
| Upload file | UPLOADING | 0-10% | <1s |
| Extract text | extracting_text | 10-35% | 5-30s |
| Analyze KCs | extracting_kcs | 35-60% | 10-60s |
| Generate items | generating_items | 60-99% | 20-120s |
| Complete | ready | 100% | — |

**Real-time monitoring:**
- Primary: Supabase Realtime subscription on `content_sources` UPDATE
- Fallback: Polling every 2 seconds if Realtime fails

### State Management Summary

| State | Location | Purpose |
|-------|----------|---------|
| enrichedSources | useSources hook | Cached source data with computed fields |
| searchQuery | useSources hook | Text filter |
| domainFilter | useSources hook | Domain dropdown selection |
| sortBy/sortOrder | useSources hook | Sort configuration |
| showUploadZone | Sources.jsx | Upload panel visibility |
| selectedSource | Sources.jsx | Source shown in detail panel |
| processingStatus | useSourceProcessing | Real-time upload progress |

---

## Part 4: Implementation Checklist

### Immediate (Fix Critical Bugs)

- [ ] **Diagnose RLS issue** - Run diagnostic queries in Supabase
- [ ] **Apply RLS fix** - Run `migrations/fix_practice_items_rls.sql`
- [ ] **Verify RLS works** - Test direct Supabase query for practice_items
- [ ] **Fix Study page filtering** - Remove redundant `.eq('user_id')` from migration.py
- [ ] **Test Study page** - Verify items load correctly

### Cleanup (After Fixes Verified)

- [ ] **Remove RLS workaround** - Delete lines 47-63 in useSources.js
- [ ] **Remove debug endpoint** - Gate `/api/migration/debug-items` behind dev flag
- [ ] **Update documentation** - Note that workarounds have been removed

### Verification Testing

- [ ] **Sources page** - Upload document, verify KC/item counts display
- [ ] **Study page** - Navigate to /study, verify items load
- [ ] **Data isolation** - Create second user, verify they see empty list
- [ ] **Progress tracking** - Complete study session, verify mastery updates

---

## Appendix: Database Query Reference

### Sources View Queries

**Fetch all sources with enrichment:**
```javascript
// Base sources
const { data: sources } = await supabase
  .from('content_sources')
  .select('*')
  .order('ingested_at', { ascending: false })

// KCs per source
const { data: kcs } = await supabase
  .from('knowledge_components')
  .select('id, source_id, name')

// KC mastery state
const { data: states } = await supabase
  .from('kc_state')
  .select('kc_id, mastery_level, next_review_at, exposure_count')

// Practice items (via API due to RLS issue)
const response = await fetch('/api/migration/all-practice-items', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

**Delete source (cascade):**
```sql
-- FK constraints handle cascade
DELETE FROM content_sources WHERE id = ? AND user_id = auth.uid();

-- This automatically deletes:
-- → knowledge_components (via FK cascade)
--   → practice_items (via FK cascade)
--   → kc_state (via FK cascade)
-- → document_sections
-- → reading_progress
-- → annotations
```

---

## Revision History

- 2026-01-07: Initial RLS/Sources research (10 parallel agents)
- 2026-01-06: Authentication & Multi-User plan (M41-M46)
