import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

// Session validity window (7 days in milliseconds)
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

// localStorage keys
const STORAGE_KEY = 'study_session_cache'
const LOCK_KEY = 'study_session_lock'

/**
 * useSessionPersistence - Manages study session persistence across page reloads
 *
 * Features:
 * - Checks for incomplete sessions on mount
 * - Saves session state to localStorage (fast) + database (durable)
 * - Debounced database saves to avoid overwhelming Supabase
 * - Handles session recovery dialog state
 * - Multiple tab prevention via localStorage lock
 *
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce interval for DB saves (default: 1000)
 * @param {string} options.sourceId - Optional source filter for the session
 * @returns {Object} Session persistence state and methods
 */
export function useSessionPersistence(options = {}) {
  const { supabase, session } = useSupabase()
  const { debounceMs = 1000, sourceId = null } = options

  // Recovery state
  const [incompleteSession, setIncompleteSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)

  // Save state
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error'
  const [lastSaveTime, setLastSaveTime] = useState(null)

  // Tab lock state
  const [isTabLocked, setIsTabLocked] = useState(false)

  // Refs
  const saveTimeoutRef = useRef(null)
  const currentSessionRef = useRef(null)
  const lockIdRef = useRef(null)

  // Get current user ID
  const userId = session?.user?.id

  /**
   * Generate a unique lock ID for this tab
   */
  useEffect(() => {
    lockIdRef.current = `${Date.now()}_${Math.random().toString(36).slice(2)}`
  }, [])

  /**
   * Check for incomplete sessions on mount
   */
  useEffect(() => {
    async function checkIncompleteSession() {
      if (!supabase) {
        return // Wait for supabase to be available
      }

      // Get the current user - this ensures auth is loaded
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        // Auth failed or no user - stop checking
        setCheckingSession(false)
        return
      }

      try {
        // Query for user's active or paused sessions
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['active', 'paused'])
          .order('last_activity_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error checking incomplete sessions:', error)
          setCheckingSession(false)
          return
        }

        if (sessions && sessions.length > 0) {
          const latestSession = sessions[0]
          const lastActivity = new Date(latestSession.last_activity_at || latestSession.started_at)
          const sessionAge = Date.now() - lastActivity.getTime()

          // Check if session is still valid (< 7 days old)
          if (sessionAge < SESSION_MAX_AGE_MS) {
            // Also check localStorage cache for more recent data
            const cachedSession = getSessionFromCache()
            if (cachedSession && cachedSession.id === latestSession.id) {
              // Merge cached data with DB data (cache might have more recent state)
              setIncompleteSession({
                ...latestSession,
                currentIndex: cachedSession.currentIndex ?? latestSession.current_item_index,
                queueItemIds: cachedSession.queueItemIds || parseQueueItemIds(latestSession.queue_item_ids),
                itemsCompleted: latestSession.items_completed || 0
              })
            } else {
              setIncompleteSession({
                ...latestSession,
                currentIndex: latestSession.current_item_index || 0,
                queueItemIds: parseQueueItemIds(latestSession.queue_item_ids),
                itemsCompleted: latestSession.items_completed || 0
              })
            }
            setShowRecoveryDialog(true)
          } else {
            // Session too old, mark as abandoned
            await supabase
              .from('sessions')
              .update({ status: 'abandoned' })
              .eq('id', latestSession.id)
          }
        }
      } catch (err) {
        console.error('Error checking session:', err)
      } finally {
        setCheckingSession(false)
      }
    }

    checkIncompleteSession()
  }, [supabase]) // Only depend on supabase - we fetch user inside

  /**
   * Parse queue_item_ids from database (JSON string) to array
   */
  function parseQueueItemIds(queueStr) {
    if (!queueStr) return null
    try {
      return JSON.parse(queueStr)
    } catch {
      return null
    }
  }

  /**
   * Get session data from localStorage cache
   */
  function getSessionFromCache() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (!cached) return null
      return JSON.parse(cached)
    } catch {
      return null
    }
  }

  /**
   * Save session data to localStorage cache
   */
  function saveToCache(sessionData) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...sessionData,
        cachedAt: Date.now()
      }))
    } catch (err) {
      console.error('Error saving to cache:', err)
    }
  }

  /**
   * Clear localStorage cache
   */
  function clearCache() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('Error clearing cache:', err)
    }
  }

  /**
   * Acquire tab lock for exclusive session access
   */
  const acquireTabLock = useCallback((sessionId) => {
    try {
      const existingLock = localStorage.getItem(LOCK_KEY)
      if (existingLock) {
        const lock = JSON.parse(existingLock)
        // Check if lock is for same session but different tab
        if (lock.sessionId === sessionId && lock.lockId !== lockIdRef.current) {
          // Another tab has this session
          setIsTabLocked(true)
          return false
        }
      }

      // Acquire lock
      localStorage.setItem(LOCK_KEY, JSON.stringify({
        sessionId,
        lockId: lockIdRef.current,
        acquiredAt: Date.now()
      }))
      setIsTabLocked(false)
      return true
    } catch {
      return false
    }
  }, [])

  /**
   * Release tab lock
   */
  const releaseTabLock = useCallback(() => {
    try {
      const existingLock = localStorage.getItem(LOCK_KEY)
      if (existingLock) {
        const lock = JSON.parse(existingLock)
        if (lock.lockId === lockIdRef.current) {
          localStorage.removeItem(LOCK_KEY)
        }
      }
    } catch {
      // Ignore errors
    }
  }, [])

  /**
   * Save session state to database (debounced)
   */
  const saveSessionState = useCallback(async (sessionData) => {
    if (!userId || !supabase || !sessionData?.id) return

    // Update ref for immediate access
    currentSessionRef.current = sessionData

    // Save to localStorage immediately for fast recovery
    saveToCache(sessionData)
    setSaveStatus('saving')

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce database save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('sessions')
          .update({
            current_item_index: sessionData.currentIndex,
            queue_item_ids: JSON.stringify(sessionData.queueItemIds),
            items_completed: sessionData.itemsCompleted,
            last_activity_at: new Date().toISOString(),
            status: 'active'
          })
          .eq('id', sessionData.id)

        if (error) throw error

        setSaveStatus('saved')
        setLastSaveTime(Date.now())
      } catch (err) {
        console.error('Error saving session state:', err)
        setSaveStatus('error')
      }
    }, debounceMs)
  }, [userId, supabase, debounceMs])

  /**
   * Initialize a new session with queue data
   */
  const initializeSession = useCallback(async (sessionId, queueItemIds) => {
    if (!userId || !supabase) return false

    try {
      // Try to acquire lock
      if (!acquireTabLock(sessionId)) {
        return false
      }

      // Update session with initial queue
      const { error } = await supabase
        .from('sessions')
        .update({
          current_item_index: 0,
          queue_item_ids: JSON.stringify(queueItemIds),
          last_activity_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', sessionId)

      if (error) throw error

      // Cache the initial state
      saveToCache({
        id: sessionId,
        currentIndex: 0,
        queueItemIds,
        itemsCompleted: 0
      })

      return true
    } catch (err) {
      console.error('Error initializing session:', err)
      return false
    }
  }, [userId, supabase, acquireTabLock])

  /**
   * Resume an incomplete session
   */
  const resumeSession = useCallback(async () => {
    if (!incompleteSession) return null

    // Try to acquire lock
    if (!acquireTabLock(incompleteSession.id)) {
      console.warn('This session is already open in another tab.')
      // Force acquire the lock anyway (user explicitly clicked Resume)
      localStorage.setItem(LOCK_KEY, JSON.stringify({
        sessionId: incompleteSession.id,
        lockId: lockIdRef.current,
        acquiredAt: Date.now()
      }))
    }

    // Update status to active
    try {
      await supabase
        .from('sessions')
        .update({
          status: 'active',
          last_activity_at: new Date().toISOString()
        })
        .eq('id', incompleteSession.id)
    } catch (err) {
      console.error('Error resuming session:', err)
    }

    setShowRecoveryDialog(false)
    return incompleteSession
  }, [incompleteSession, supabase, acquireTabLock])

  /**
   * Start a fresh session (abandon incomplete one)
   */
  const startFresh = useCallback(async () => {
    if (incompleteSession) {
      // Mark the old session as abandoned
      try {
        await supabase
          .from('sessions')
          .update({ status: 'abandoned' })
          .eq('id', incompleteSession.id)
      } catch (err) {
        console.error('Error abandoning session:', err)
      }
    }

    // Clear cache
    clearCache()
    setIncompleteSession(null)
    setShowRecoveryDialog(false)

    return null
  }, [incompleteSession, supabase])

  /**
   * Mark session as completed
   */
  const completeSession = useCallback(async (sessionId, stats) => {
    if (!supabase || !sessionId) return

    try {
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          items_completed: stats?.itemsCompleted,
          average_score: stats?.averageScore,
          actual_duration_minutes: stats?.durationMinutes
        })
        .eq('id', sessionId)

      // Clear cache and release lock
      clearCache()
      releaseTabLock()
    } catch (err) {
      console.error('Error completing session:', err)
    }
  }, [supabase, releaseTabLock])

  /**
   * Pause session (called on beforeunload)
   */
  const pauseSession = useCallback(async () => {
    const sessionData = currentSessionRef.current
    if (!sessionData?.id || !supabase) return

    try {
      // Use synchronous localStorage save for reliability
      saveToCache(sessionData)

      // Try async DB update (may not complete before unload)
      await supabase
        .from('sessions')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          current_item_index: sessionData.currentIndex,
          queue_item_ids: JSON.stringify(sessionData.queueItemIds),
          items_completed: sessionData.itemsCompleted,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', sessionData.id)
    } catch (err) {
      console.error('Error pausing session:', err)
    }
  }, [supabase])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      releaseTabLock()
    }
  }, [releaseTabLock])

  /**
   * Listen for storage events (other tabs)
   */
  useEffect(() => {
    function handleStorageChange(e) {
      if (e.key === LOCK_KEY && currentSessionRef.current) {
        const newLock = e.newValue ? JSON.parse(e.newValue) : null
        if (newLock && newLock.sessionId === currentSessionRef.current.id && newLock.lockId !== lockIdRef.current) {
          // Another tab took the lock
          setIsTabLocked(true)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  return {
    // Recovery
    incompleteSession,
    checkingSession,
    showRecoveryDialog,
    resumeSession,
    startFresh,

    // Save state
    saveStatus,
    lastSaveTime,
    saveSessionState,

    // Session lifecycle
    initializeSession,
    completeSession,
    pauseSession,

    // Tab management
    isTabLocked,
    acquireTabLock,
    releaseTabLock
  }
}
