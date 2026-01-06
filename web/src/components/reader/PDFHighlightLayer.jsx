import { memo, useState } from 'react'
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

  if (!highlights || highlights.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 10 }}>
      {highlights.map(highlight => {
        const rects = highlight.pdf_rects || []

        return rects
          .filter(r => r.page === pageNumber)
          .map((rect, i) => (
            <div
              key={`${highlight.id}-${i}`}
              className="absolute pointer-events-auto cursor-pointer transition-all duration-150 hover:brightness-90"
              style={{
                left: `${rect.x}%`,
                top: `${rect.y}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
                backgroundColor: highlight.color || '#FFEB3B',
                opacity: 0.4,
                borderRadius: '2px',
                mixBlendMode: 'multiply'
              }}
              onMouseEnter={() => setHoveredId(highlight.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteHighlight?.(highlight.id)
              }}
            >
              {hoveredId === highlight.id && i === 0 && (
                <div
                  className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs flex items-center gap-1 whitespace-nowrap z-50 shadow-lg"
                  style={{ pointerEvents: 'none' }}
                >
                  <Trash2 className="w-3 h-3" />
                  Click to delete
                </div>
              )}
            </div>
          ))
      })}
    </div>
  )
})

export default PDFHighlightLayer
