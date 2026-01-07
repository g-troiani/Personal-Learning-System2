import { memo, useState, useRef, useCallback } from 'react'
import { Trash2 } from 'lucide-react'

/**
 * Renders highlight overlays on a PDF page using percentage-based positioning.
 * Each highlight can span multiple rectangles (for multi-line selections).
 *
 * @param {number} pageNumber - The page number this layer is for
 * @param {Array} highlights - Highlights to render on this page
 * @param {Function} onDeleteHighlight - Callback when highlight is deleted
 */
const PDFHighlightLayer = memo(function PDFHighlightLayer({
  pageNumber,
  highlights,
  onDeleteHighlight
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const hideTimeoutRef = useRef(null)

  // Clear any pending hide timeout when entering a highlight
  const handleMouseEnter = useCallback((highlightId) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setHoveredId(highlightId)
  }, [])

  // Delay hiding to allow mouse to move to delete button
  const handleMouseLeave = useCallback(() => {
    hideTimeoutRef.current = setTimeout(() => {
      setHoveredId(null)
    }, 150) // 150ms delay gives time to reach the button
  }, [])

  if (!highlights || highlights.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
      {highlights.map(highlight => {
        const rects = highlight.pdf_rects || []
        const pageRects = rects.filter(r => r.page === pageNumber)

        if (pageRects.length === 0) return null

        // Get bounds of first rect to position delete button
        const firstRect = pageRects[0]
        const isHovered = hoveredId === highlight.id

        return (
          <div key={highlight.id}>
            {/* Delete button - positioned above first rect */}
            {isHovered && (
              <button
                className="absolute pointer-events-auto bg-gray-800 hover:bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 whitespace-nowrap z-50 shadow-lg cursor-pointer transition-colors"
                style={{
                  left: `${firstRect.x + firstRect.width / 2}%`,
                  top: `${firstRect.y}%`,
                  transform: 'translate(-50%, -120%)'
                }}
                onMouseEnter={() => handleMouseEnter(highlight.id)}
                onMouseLeave={handleMouseLeave}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteHighlight?.(highlight.id)
                }}
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}

            {/* Highlight rectangles */}
            {pageRects.map((rect, i) => (
              <div
                key={`${highlight.id}-${i}`}
                className="absolute pointer-events-auto transition-all duration-150"
                style={{
                  left: `${rect.x}%`,
                  top: `${rect.y}%`,
                  width: `${rect.width}%`,
                  height: `${rect.height}%`,
                  backgroundColor: highlight.color || '#FFEB3B',
                  opacity: isHovered ? 0.6 : 0.4,
                  borderRadius: '2px',
                  mixBlendMode: 'multiply'
                }}
                onMouseEnter={() => handleMouseEnter(highlight.id)}
                onMouseLeave={handleMouseLeave}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
})

export default PDFHighlightLayer
