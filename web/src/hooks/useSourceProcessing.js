import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

/**
 * Custom hook for monitoring source processing status via Supabase Realtime
 * Falls back to polling if Realtime subscription fails
 */
export function useSourceProcessing(sourceId) {
  const { supabase } = useSupabase()

  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const subscriptionRef = useRef(null)
  const pollingIntervalRef = useRef(null)

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    if (!sourceId) return null

    try {
      const { data, error: fetchError } = await supabase
        .from('content_sources')
        .select('id, title, processing_status, processing_progress, processing_step, error_message, processing_started_at, processing_completed_at')
        .eq('id', sourceId)
        .single()

      if (fetchError) throw fetchError

      setStatus(data)
      setError(null)
      return data
    } catch (err) {
      console.error('Error fetching processing status:', err)
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [sourceId, supabase])

  // Set up Supabase Realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!sourceId || !supabase) return

    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    try {
      const channel = supabase
        .channel(`source-processing-${sourceId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'content_sources',
            filter: `id=eq.${sourceId}`
          },
          (payload) => {
            console.log('Realtime update received:', payload.new)
            setStatus(payload.new)

            // Check if processing is complete
            if (payload.new.processing_status === 'ready' || payload.new.processing_status === 'error') {
              // Optionally trigger a callback or state change
            }
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status)

          // If subscription fails, fall back to polling
          if (status === 'SUBSCRIPTION_ERROR' || status === 'TIMED_OUT') {
            console.log('Realtime subscription failed, falling back to polling')
            startPolling()
          }
        })

      subscriptionRef.current = channel
    } catch (err) {
      console.error('Error setting up realtime subscription:', err)
      // Fall back to polling
      startPolling()
    }
  }, [sourceId, supabase])

  // Polling fallback
  const startPolling = useCallback(() => {
    // Clear any existing polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(async () => {
      const data = await fetchStatus()

      // Stop polling if processing is complete
      if (data && (data.processing_status === 'ready' || data.processing_status === 'error')) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }, 2000)
  }, [fetchStatus])

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Initialize: fetch initial status and set up subscription
  useEffect(() => {
    if (!sourceId) {
      setStatus(null)
      setLoading(false)
      return
    }

    // Fetch initial status
    fetchStatus()

    // Set up realtime subscription
    setupRealtimeSubscription()

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      stopPolling()
    }
  }, [sourceId, fetchStatus, setupRealtimeSubscription, stopPolling])

  // Computed values
  const isProcessing = status && !['ready', 'error'].includes(status.processing_status)
  const isComplete = status?.processing_status === 'ready'
  const hasError = status?.processing_status === 'error'
  const progress = status?.processing_progress || 0
  const step = status?.processing_step || ''

  return {
    status,
    loading,
    error,
    isProcessing,
    isComplete,
    hasError,
    progress,
    step,
    refresh: fetchStatus
  }
}

/**
 * Hook to monitor multiple sources' processing status
 */
export function useMultipleSourceProcessing(sourceIds) {
  const { supabase } = useSupabase()
  const [processingStatuses, setProcessingStatuses] = useState({})

  const fetchAllStatuses = useCallback(async () => {
    if (!sourceIds || sourceIds.length === 0) return

    try {
      const { data, error } = await supabase
        .from('content_sources')
        .select('id, processing_status, processing_progress, processing_step')
        .in('id', sourceIds)

      if (error) throw error

      const statusMap = {}
      data?.forEach(source => {
        statusMap[source.id] = source
      })
      setProcessingStatuses(statusMap)
    } catch (err) {
      console.error('Error fetching multiple processing statuses:', err)
    }
  }, [sourceIds, supabase])

  useEffect(() => {
    fetchAllStatuses()
  }, [fetchAllStatuses])

  return {
    processingStatuses,
    refresh: fetchAllStatuses
  }
}
