import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Find the closest annotation container (article, pre, .docx-container) from a node.
 * This ensures offset calculations match what AnnotationLayer uses.
 */
function findAnnotationContainer(node) {
  let current = node
  while (current && current !== document.body) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current
      // Check for known annotation container types
      if (element.tagName === 'ARTICLE' ||
          element.tagName === 'PRE' ||
          element.classList?.contains('docx-container')) {
        return element
      }
    }
    current = current.parentNode
  }
  return null
}

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

    // Detect if selection is within a PDF page
    const pageElement = range.startContainer.parentElement?.closest('[data-page-number]')

    if (pageElement) {
      // PDF selection - use page-based positioning with percentages
      const pageNumber = parseInt(pageElement.dataset.pageNumber, 10)
      const pageRect = pageElement.getBoundingClientRect()

      return {
        text,
        range: range.cloneRange(),
        isPDF: true,
        pageNumber,
        pdfRect: {
          page: pageNumber,
          x: ((rect.left - pageRect.left) / pageRect.width) * 100,
          y: ((rect.top - pageRect.top) / pageRect.height) * 100,
          width: (rect.width / pageRect.width) * 100,
          height: (rect.height / pageRect.height) * 100
        },
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
    }

    // Non-PDF selection - use TreeWalker to calculate offsets
    // This must match how AnnotationLayer calculates offsets for proper rendering
    // Use the annotation container (article, pre, docx-container) not the outer wrapper
    const annotationContainer = findAnnotationContainer(range.startContainer)
    const container = annotationContainer || containerRef?.current || document.body
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text nodes inside style, script, and other non-visible elements
          // This must match the filter in AnnotationLayer
          const parent = node.parentElement
          if (parent) {
            const tagName = parent.tagName?.toUpperCase()
            if (tagName === 'STYLE' || tagName === 'SCRIPT' || tagName === 'NOSCRIPT') {
              return NodeFilter.FILTER_REJECT
            }
          }
          return NodeFilter.FILTER_ACCEPT
        }
      }
    )

    let currentOffset = 0
    let startOffset = 0
    let endOffset = 0
    let node
    let foundStart = false
    let foundEnd = false

    while ((node = walker.nextNode()) && !foundEnd) {
      const nodeLength = node.textContent.length

      // Check if this node contains the selection start
      if (!foundStart && node === range.startContainer) {
        startOffset = currentOffset + range.startOffset
        foundStart = true
      }

      // Check if this node contains the selection end
      if (!foundEnd && node === range.endContainer) {
        endOffset = currentOffset + range.endOffset
        foundEnd = true
      }

      currentOffset += nodeLength
    }

    // Fallback if we couldn't find the nodes (shouldn't happen but just in case)
    if (!foundStart || !foundEnd) {
      const preSelectionRange = range.cloneRange()
      preSelectionRange.selectNodeContents(container)
      preSelectionRange.setEnd(range.startContainer, range.startOffset)
      startOffset = preSelectionRange.toString().length
      endOffset = startOffset + text.length
    }

    return {
      text,
      range: range.cloneRange(),
      isPDF: false,
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
