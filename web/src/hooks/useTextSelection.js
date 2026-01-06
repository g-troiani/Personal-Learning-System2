import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook to detect and manage text selection in the document reader
 *
 * Returns:
 * - selection: Object containing selected text, range, and position info
 * - clearSelection: Function to clear the current selection
 * - isSelecting: Boolean indicating if user is currently selecting
 */
export function useTextSelection(containerRef) {
  const [selection, setSelection] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const selectionTimeoutRef = useRef(null)

  const getSelectionInfo = useCallback(() => {
    const windowSelection = window.getSelection()

    if (!windowSelection || windowSelection.isCollapsed || !windowSelection.rangeCount) {
      return null
    }

    const range = windowSelection.getRangeAt(0)
    const text = windowSelection.toString().trim()

    // Ignore very short selections (likely accidental clicks)
    if (text.length < 3) {
      return null
    }

    // Check if selection is within our container
    if (containerRef?.current && !containerRef.current.contains(range.commonAncestorContainer)) {
      return null
    }

    // Get bounding rect for positioning the tooltip
    const rect = range.getBoundingClientRect()

    // Get scroll position to calculate absolute position
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft

    // Calculate character offsets for storing annotations
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(containerRef?.current || document.body)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preSelectionRange.toString().length
    const endOffset = startOffset + text.length

    return {
      text,
      range: range.cloneRange(),
      startOffset,
      endOffset,
      rect: {
        top: rect.top + scrollTop,
        left: rect.left + scrollLeft,
        right: rect.right + scrollLeft,
        bottom: rect.bottom + scrollTop,
        width: rect.width,
        height: rect.height,
        // Position for tooltip (centered above selection)
        tooltipX: rect.left + scrollLeft + (rect.width / 2),
        tooltipY: rect.top + scrollTop - 10
      }
    }
  }, [containerRef])

  const handleMouseUp = useCallback(() => {
    // Small delay to let the selection finalize
    selectionTimeoutRef.current = setTimeout(() => {
      const selectionInfo = getSelectionInfo()
      if (selectionInfo) {
        setSelection(selectionInfo)
      }
      setIsSelecting(false)
    }, 10)
  }, [getSelectionInfo])

  const handleMouseDown = useCallback((e) => {
    // Don't clear selection if clicking inside the tooltip
    if (e.target.closest('.selection-tooltip')) {
      return
    }
    setIsSelecting(true)
    setSelection(null)
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
    }
  }, [])

  const handleKeyUp = useCallback((e) => {
    // Handle Shift+Arrow key selections
    if (e.shiftKey) {
      const selectionInfo = getSelectionInfo()
      if (selectionInfo) {
        setSelection(selectionInfo)
      }
    }
  }, [getSelectionInfo])

  const clearSelection = useCallback(() => {
    setSelection(null)
    window.getSelection()?.removeAllRanges()
  }, [])

  useEffect(() => {
    const container = containerRef?.current || document

    container.addEventListener('mouseup', handleMouseUp)
    container.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      container.removeEventListener('mouseup', handleMouseUp)
      container.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keyup', handleKeyUp)
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [containerRef, handleMouseUp, handleMouseDown, handleKeyUp])

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selection && !e.target.closest('.selection-tooltip')) {
        // Don't clear if clicking on the tooltip
        clearSelection()
      }
    }

    // Add with a small delay to avoid clearing immediately after selection
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selection, clearSelection])

  return {
    selection,
    clearSelection,
    isSelecting
  }
}

export default useTextSelection
