import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'

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
  const { user } = useAuth()
  const [annotations, setAnnotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Sort annotations by position (handles both offset and page-based)
  const sortAnnotations = useCallback((annotations) => {
    return [...annotations].sort((a, b) => {
      // PDF annotations sort by page, then y position
      if (a.position_type === 'page_rect' && b.position_type === 'page_rect') {
        const aPage = a.page_number || a.pdf_rects?.[0]?.page || 0
        const bPage = b.page_number || b.pdf_rects?.[0]?.page || 0
        if (aPage !== bPage) return aPage - bPage
        const aY = a.pdf_rects?.[0]?.y || 0
        const bY = b.pdf_rects?.[0]?.y || 0
        return aY - bY
      }
      // Offset-based annotations sort by start_offset
      if (a.position_type !== 'page_rect' && b.position_type !== 'page_rect') {
        return (a.start_offset || 0) - (b.start_offset || 0)
      }
      // Mixed: offset first, then page_rect
      return a.position_type === 'page_rect' ? 1 : -1
    })
  }, [])

  // Fetch annotations for this source
  const fetchAnnotations = useCallback(async () => {
    if (!sourceId || !supabase) return

    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('annotations')
        .select('*')
        .eq('source_id', sourceId)

      if (fetchError) throw fetchError
      setAnnotations(sortAnnotations(data || []))
    } catch (err) {
      console.error('Error fetching annotations:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sourceId, supabase, sortAnnotations])

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
              // Sort by position type (handles both offset and page-based)
              const updated = [...prev, payload.new]
              return updated.sort((a, b) => {
                if (a.position_type === 'page_rect' && b.position_type === 'page_rect') {
                  const aPage = a.page_number || a.pdf_rects?.[0]?.page || 0
                  const bPage = b.page_number || b.pdf_rects?.[0]?.page || 0
                  if (aPage !== bPage) return aPage - bPage
                  return (a.pdf_rects?.[0]?.y || 0) - (b.pdf_rects?.[0]?.y || 0)
                }
                if (a.position_type !== 'page_rect' && b.position_type !== 'page_rect') {
                  return (a.start_offset || 0) - (b.start_offset || 0)
                }
                return a.position_type === 'page_rect' ? 1 : -1
              })
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
    if (!sourceId || !supabase || !selection || !user) return null

    const newAnnotation = {
      source_id: sourceId,
      user_id: user.id,
      annotation_type: 'highlight',
      selected_text: selection.text.substring(0, 500), // Limit text length
      color
    }

    // Handle PDF vs offset-based positioning
    if (selection.isPDF) {
      newAnnotation.position_type = 'page_rect'
      newAnnotation.page_number = selection.pageNumber
      newAnnotation.pdf_rects = [selection.pdfRect]
    } else {
      newAnnotation.position_type = 'offset'
      newAnnotation.start_offset = selection.startOffset
      newAnnotation.end_offset = selection.endOffset
    }

    // Optimistic update with temp ID
    const tempId = `temp_${Date.now()}`
    const optimisticAnnotation = { ...newAnnotation, id: tempId }
    setAnnotations(prev => sortAnnotations([...prev, optimisticAnnotation]))

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
  }, [sourceId, supabase, user, sortAnnotations])

  // Create a note annotation
  const createNote = useCallback(async (selection, noteText) => {
    if (!sourceId || !supabase || !user) return null

    const newAnnotation = {
      source_id: sourceId,
      user_id: user.id,
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

      setAnnotations(prev => sortAnnotations([...prev, data]))
      return data
    } catch (err) {
      console.error('Error creating note:', err)
      setError(err.message)
      return null
    }
  }, [sourceId, supabase, user, sortAnnotations])

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
        setAnnotations(prev => sortAnnotations([...prev, deletedAnnotation]))
      }
      setError(err.message)
      return false
    }
  }, [supabase, annotations, sortAnnotations])

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
