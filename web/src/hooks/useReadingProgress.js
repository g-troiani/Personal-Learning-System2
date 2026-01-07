import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

/**
 * useReadingProgress - Tracks and persists reading progress for a document
 *
 * Features:
 * - Saves scroll position and page number
 * - Tracks completion percentage
 * - Debounced sync (500ms) to avoid overwhelming database
 * - Restores position on return
 *
 * @param {string} sourceId - Document source ID
 * @param {Object} options - Configuration options
 * @param {number} options.totalPages - Total pages for PDFs (optional)
 * @param {number} options.debounceMs - Debounce interval in ms (default: 500)
 */
export function useReadingProgress(sourceId, options = {}) {
  const { supabase } = useSupabase()
  const { totalPages = null, debounceMs = 500 } = options

  const [progress, setProgress] = useState({
    scrollPosition: 0,
    currentPage: 1,
    totalPages: totalPages,
    completionPercentage: 0,
    lastReadAt: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Ref to track pending save
  const saveTimeoutRef = useRef(null)
  const progressIdRef = useRef(null)

  // Fetch existing progress on mount
  useEffect(() => {
    async function fetchProgress() {
      if (!sourceId || !supabase) return

      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('reading_progress')
          .select('*')
          .eq('source_id', sourceId)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine for new documents
          throw fetchError
        }

        if (data) {
          progressIdRef.current = data.id
          // Calculate completion percentage locally (not stored in DB)
          const total = data.total_pages || totalPages
          const completionPct = total
            ? Math.round((data.current_page / total) * 100)
            : 0
          setProgress({
            scrollPosition: data.scroll_position || 0,
            currentPage: data.current_page || 1,
            totalPages: total,
            completionPercentage: completionPct,
            lastReadAt: data.last_read_at
          })
        }
      } catch (err) {
        console.error('Error fetching reading progress:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProgress()
  }, [sourceId, supabase, totalPages])

  // Debounced save function
  const saveProgress = useCallback(async (newProgress) => {
    if (!sourceId || !supabase) return

    try {
      // Match actual table schema (no completion_percentage column - calculate locally)
      const progressData = {
        source_id: sourceId,
        scroll_position: newProgress.scrollPosition,
        current_page: newProgress.currentPage,
        total_pages: newProgress.totalPages,
        last_read_at: new Date().toISOString()
      }

      if (progressIdRef.current) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('reading_progress')
          .update(progressData)
          .eq('id', progressIdRef.current)

        if (updateError) throw updateError
      } else {
        // Use upsert to prevent duplicates (conflict on source_id)
        const { data, error: upsertError } = await supabase
          .from('reading_progress')
          .upsert(progressData, {
            onConflict: 'source_id',
            ignoreDuplicates: false
          })
          .select()
          .single()

        if (upsertError) throw upsertError
        if (data) progressIdRef.current = data.id
      }
    } catch (err) {
      console.error('Error saving reading progress:', err)
    }
  }, [sourceId, supabase])

  // Update scroll position with debounce (ratchet: only increases, never decreases)
  const updateScrollPosition = useCallback((scrollPosition, containerHeight, contentHeight) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Calculate completion percentage
    let completionPercentage = 0
    if (contentHeight > containerHeight) {
      const maxScroll = contentHeight - containerHeight
      completionPercentage = Math.min(100, Math.round((scrollPosition / maxScroll) * 100))
    }

    // Ratchet behavior: only update if new percentage is higher
    if (completionPercentage <= progress.completionPercentage) {
      return // Don't go backwards
    }

    const newProgress = {
      ...progress,
      scrollPosition,
      completionPercentage
    }

    setProgress(newProgress)

    // Debounce the save
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(newProgress)
    }, debounceMs)
  }, [progress, debounceMs, saveProgress])

  // Update page number (for PDFs)
  const updatePage = useCallback((currentPage, total = null) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    const actualTotal = total || progress.totalPages
    const completionPercentage = actualTotal
      ? Math.round((currentPage / actualTotal) * 100)
      : 0

    const newProgress = {
      ...progress,
      currentPage,
      totalPages: actualTotal,
      completionPercentage
    }

    setProgress(newProgress)

    // Debounce the save
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress(newProgress)
    }, debounceMs)
  }, [progress, debounceMs, saveProgress])

  // Manual save (for immediate persistence)
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveProgress(progress)
  }, [progress, saveProgress])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    progress,
    loading,
    error,
    updateScrollPosition,
    updatePage,
    forceSave
  }
}
