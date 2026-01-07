import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize auth state from session
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_OUT') {
          setError(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      const message = err?.message || 'Sign in failed'
      setError(message)
      return { data: null, error: message }
    }
  }, [])

  // Sign up with email/password
  const signUp = useCallback(async (email, password) => {
    try {
      setError(null)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (error) throw error
      return { data, error: null }
    } catch (err) {
      const message = err?.message || 'Sign up failed'
      setError(message)
      return { data: null, error: message }
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (err) {
      const message = err?.message || 'Sign out failed'
      setError(message)
      return { error: message }
    }
  }, [])

  // Request password reset email
  const resetPassword = useCallback(async (email) => {
    try {
      setError(null)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error
      return { error: null }
    } catch (err) {
      const message = err?.message || 'Password reset failed'
      setError(message)
      return { error: message }
    }
  }, [])

  // Update password (after clicking reset link)
  const updatePassword = useCallback(async (newPassword) => {
    try {
      setError(null)
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error
      return { error: null }
    } catch (err) {
      const message = err?.message || 'Password update failed'
      setError(message)
      return { error: message }
    }
  }, [])

  // Get current access token for API calls
  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [])

  // Clear any error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    getAccessToken,
    clearError,
    isAuthenticated: !!session,
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
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
