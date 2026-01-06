import { useEffect, useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

/**
 * AnnotationLayer - Renders highlight overlays on document text
 *
 * This component creates visual highlights by:
 * 1. Finding text nodes in the document that match annotation offsets
 * 2. Wrapping matched ranges with styled span elements
 *
 * Props:
 * - highlights: Array of highlight annotations from useAnnotations
 * - containerRef: Ref to the document content container
 * - onDeleteHighlight: (annotationId) => void
 */
export default function AnnotationLayer({
  highlights = [],
  containerRef,
  onDeleteHighlight
}) {
  const [activeHighlight, setActiveHighlight] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const highlightRefs = useRef({})

  // Apply highlights to the document
  const applyHighlights = useCallback(() => {
    if (!containerRef?.current || highlights.length === 0) return

    // Remove existing highlights first
    const existingHighlights = containerRef.current.querySelectorAll('.annotation-highlight')
    existingHighlights.forEach(el => {
      const parent = el.parentNode
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el)
      }
      parent.removeChild(el)
    })

    // Get all text nodes in the container
    const walker = document.createTreeWalker(
      containerRef.current,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )

    const textNodes = []
    let currentOffset = 0
    let node

    while ((node = walker.nextNode())) {
      const length = node.textContent.length
      textNodes.push({
        node,
        start: currentOffset,
        end: currentOffset + length
      })
      currentOffset += length
    }

    // Apply each highlight
    highlights.forEach(highlight => {
      const { id, start_offset, end_offset, color } = highlight

      // Find text nodes that overlap with this highlight
      const relevantNodes = textNodes.filter(
        tn => tn.start < end_offset && tn.end > start_offset
      )

      relevantNodes.forEach(({ node, start, end }) => {
        const highlightStart = Math.max(start_offset - start, 0)
        const highlightEnd = Math.min(end_offset - start, node.textContent.length)

        if (highlightStart >= highlightEnd) return

        try {
          const range = document.createRange()
          range.setStart(node, highlightStart)
          range.setEnd(node, highlightEnd)

          const span = document.createElement('span')
          span.className = 'annotation-highlight cursor-pointer transition-all hover:brightness-90'
          span.style.backgroundColor = color || '#FFEB3B'
          span.style.borderRadius = '2px'
          span.dataset.annotationId = id

          // Click handler to show delete option
          span.addEventListener('click', (e) => {
            e.stopPropagation()
            const rect = span.getBoundingClientRect()
            setTooltipPosition({
              top: rect.top + window.scrollY - 40,
              left: rect.left + window.scrollX + (rect.width / 2)
            })
            setActiveHighlight(id)
          })

          range.surroundContents(span)
          highlightRefs.current[id] = span
        } catch (err) {
          // Range operations can fail on complex DOM structures
          console.warn('Could not apply highlight:', err)
        }
      })
    })
  }, [highlights, containerRef])

  // Re-apply highlights when they change
  useEffect(() => {
    // Delay to ensure content is rendered
    const timeout = setTimeout(applyHighlights, 100)
    return () => clearTimeout(timeout)
  }, [applyHighlights])

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setActiveHighlight(null)
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const handleDelete = (e) => {
    e.stopPropagation()
    if (activeHighlight && onDeleteHighlight) {
      onDeleteHighlight(activeHighlight)
      setActiveHighlight(null)
    }
  }

  return (
    <>
      {/* Highlight delete tooltip */}
      {activeHighlight && (
        <div
          className="fixed z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: 'translateX(-50%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm">Remove highlight?</span>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        </div>
      )}
    </>
  )
}
