import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

/**
 * Custom hook to manage annotations (highlights, notes) for a document
 *
 * Features:
 * - Fetches annotations from Supabase
 * - Creates, updates, and deletes annotations
 * - Optimistic updates for smooth UX
 * - Real-time subscription for updates
 */
export function useAnnotations(sourceId) {
  const { supabase } = useSupabase()
  const [annotations, setAnnotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch annotations for this source
  const fetchAnnotations = useCallback(async () => {
    if (!sourceId || !supabase) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('annotations')
        .select('*')
        .eq('source_id', sourceId)
        .order('start_offset', { ascending: true })

      if (fetchError) throw fetchError
      setAnnotations(data || [])
    } catch (err) {
      console.error('Error fetching annotations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sourceId, supabase])

  // Load annotations on mount
  useEffect(() => {
    fetchAnnotations()
  }, [fetchAnnotations])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sourceId || !supabase) return

    const channel = supabase
      .channel(`annotations:${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `source_id=eq.${sourceId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAnnotations(prev => {
              // Avoid duplicates from optimistic updates
              if (prev.some(a => a.id === payload.new.id)) return prev
              return [...prev, payload.new].sort((a, b) => a.start_offset - b.start_offset)
            })
          } else if (payload.eventType === 'UPDATE') {
            setAnnotations(prev =>
              prev.map(a => a.id === payload.new.id ? payload.new : a)
            )
          } else if (payload.eventType === 'DELETE') {
            setAnnotations(prev =>
              prev.filter(a => a.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sourceId, supabase])

  // Create a new highlight annotation
  const createHighlight = useCallback(async (selection, color = '#FFEB3B') => {
    if (!sourceId || !supabase || !selection) return null

    const newAnnotation = {
      source_id: sourceId,
      annotation_type: 'highlight',
      start_offset: selection.startOffset,
      end_offset: selection.endOffset,
      selected_text: selection.text.substring(0, 500), // Limit text length
      color
    }

    // Optimistic update with temp ID
    const tempId = `temp_${Date.now()}`
    const optimisticAnnotation = { ...newAnnotation, id: tempId }
    setAnnotations(prev => [...prev, optimisticAnnotation].sort((a, b) => a.start_offset - b.start_offset))

    try {
      const { data, error: insertError } = await supabase
        .from('annotations')
        .insert(newAnnotation)
        .select()
        .single()

      if (insertError) throw insertError

      // Replace temp with real annotation
      setAnnotations(prev =>
        prev.map(a => a.id === tempId ? data : a)
      )

      return data
    } catch (err) {
      console.error('Error creating highlight:', err)
      // Rollback optimistic update
      setAnnotations(prev => prev.filter(a => a.id !== tempId))
      setError(err.message)
      return null
    }
  }, [sourceId, supabase])

  // Create a note annotation
  const createNote = useCallback(async (selection, noteText) => {
    if (!sourceId || !supabase) return null

    const newAnnotation = {
      source_id: sourceId,
      annotation_type: 'note',
      start_offset: selection?.startOffset || 0,
      end_offset: selection?.endOffset || 0,
      selected_text: selection?.text?.substring(0, 500) || '',
      note_content: noteText
    }

    try {
      const { data, error: insertError } = await supabase
        .from('annotations')
        .insert(newAnnotation)
        .select()
        .single()

      if (insertError) throw insertError

      setAnnotations(prev => [...prev, data].sort((a, b) => a.start_offset - b.start_offset))
      return data
    } catch (err) {
      console.error('Error creating note:', err)
      setError(err.message)
      return null
    }
  }, [sourceId, supabase])

  // Update an annotation (color or note text)
  const updateAnnotation = useCallback(async (annotationId, updates) => {
    if (!supabase) return false

    // Optimistic update
    setAnnotations(prev =>
      prev.map(a => a.id === annotationId ? { ...a, ...updates, updated_at: new Date().toISOString() } : a)
    )

    try {
      const { error: updateError } = await supabase
        .from('annotations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', annotationId)

      if (updateError) throw updateError
      return true
    } catch (err) {
      console.error('Error updating annotation:', err)
      // Rollback - refetch
      fetchAnnotations()
      setError(err.message)
      return false
    }
  }, [supabase, fetchAnnotations])

  // Delete an annotation
  const deleteAnnotation = useCallback(async (annotationId) => {
    if (!supabase) return false

    // Optimistic delete
    const deletedAnnotation = annotations.find(a => a.id === annotationId)
    setAnnotations(prev => prev.filter(a => a.id !== annotationId))

    try {
      const { error: deleteError } = await supabase
        .from('annotations')
        .delete()
        .eq('id', annotationId)

      if (deleteError) throw deleteError
      return true
    } catch (err) {
      console.error('Error deleting annotation:', err)
      // Rollback
      if (deletedAnnotation) {
        setAnnotations(prev => [...prev, deletedAnnotation].sort((a, b) => a.start_offset - b.start_offset))
      }
      setError(err.message)
      return false
    }
  }, [supabase, annotations])

  // Get only highlights
  const highlights = annotations.filter(a => a.annotation_type === 'highlight')

  // Get only notes
  const notes = annotations.filter(a => a.annotation_type === 'note')

  return {
    annotations,
    highlights,
    notes,
    loading,
    error,
    createHighlight,
    createNote,
    updateAnnotation,
    deleteAnnotation,
    refresh: fetchAnnotations
  }
}

export default useAnnotations
