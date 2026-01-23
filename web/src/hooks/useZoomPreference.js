import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

// Zoom constraints (must match renderer constants)
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0
const DEFAULT_ZOOM = 1.0

/**
 * useZoomPreference - Persists user's zoom level preference across sessions
 *
 * Features:
 * - Loads saved zoom level on mount
 * - Debounced save (500ms) to avoid overwhelming database
 * - Clamps zoom to valid range
 * - Falls back to default if no preference saved
 *
 * @param {Object} options - Configuration options
 * @param {number} options.debounceMs - Debounce interval in ms (default: 500)
 * @returns {Object} { zoom, setZoom, loading }
 */
export function useZoomPreference(options = {}) {
  const { supabase, session } = useSupabase()
  const { debounceMs = 500 } = options

  const [zoom, setZoomState] = useState(DEFAULT_ZOOM)
  const [loading, setLoading] = useState(true)

  // Ref to track pending save
  const saveTimeoutRef = useRef(null)
  const initialLoadRef = useRef(false)

  // Get current user ID
  const userId = session?.user?.id

  // Fetch existing preference on mount
  useEffect(() => {
    async function fetchPreference() {
      if (!userId || !supabase) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('user_preferences')
          .select('preference_value')
          .eq('user_id', userId)
          .eq('preference_key', 'reader_zoom')
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine for new users
          throw fetchError
        }

        if (data?.preference_value?.zoom) {
          const savedZoom = Number(data.preference_value.zoom)
          // Clamp to valid range
          const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, savedZoom))
          setZoomState(clampedZoom)
        }

        initialLoadRef.current = true
      } catch (err) {
        console.error('Error fetching zoom preference:', err)
        // Fall back to default zoom
      } finally {
        setLoading(false)
      }
    }

    fetchPreference()
  }, [userId, supabase])

  // Save preference to database
  const savePreference = useCallback(async (newZoom) => {
    if (!userId || !supabase) return

    try {
      const { error: upsertError } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          preference_key: 'reader_zoom',
          preference_value: { zoom: newZoom },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,preference_key'
        })

      if (upsertError) throw upsertError
    } catch (err) {
      console.error('Error saving zoom preference:', err)
    }
  }, [userId, supabase])

  // Set zoom with debounced save
  const setZoom = useCallback((newZoomOrFn) => {
    setZoomState(prevZoom => {
      // Support both direct value and function updater
      const newZoom = typeof newZoomOrFn === 'function'
        ? newZoomOrFn(prevZoom)
        : newZoomOrFn

      // Clamp to valid range
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))

      // Don't save on initial load
      if (!initialLoadRef.current) {
        return clampedZoom
      }

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce the save
      saveTimeoutRef.current = setTimeout(() => {
        savePreference(clampedZoom)
      }, debounceMs)

      return clampedZoom
    })
  }, [debounceMs, savePreference])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    zoom,
    setZoom,
    loading
  }
}
