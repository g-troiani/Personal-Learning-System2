import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import PDFHighlightLayer from './PDFHighlightLayer'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Import required CSS for text layer
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

/**
 * PDF Renderer component using react-pdf with text layer enabled.
 * Shows all pages in a continuous scrollable view (like DOCX).
 * Memoized to prevent unnecessary re-renders.
 *
 * @param {string} fileUrl - Signed URL to the PDF file
 * @param {Function} onPageChange - Callback when page changes (page, totalPages)
 * @param {Function} onScroll - Callback for scroll tracking (scrollTop, clientHeight, scrollHeight)
 * @param {number} initialPage - Page number to scroll to initially (default: 1)
 * @param {Array} highlights - Highlight annotations to display
 * @param {Function} onDeleteHighlight - Callback when highlight is deleted
 */
// Base width for PDF pages
const BASE_WIDTH = 800

// Zoom levels
const ZOOM_STEP = 0.1
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0

const PDFRenderer = memo(function PDFRenderer({
  fileUrl,
  onPageChange,
  onScroll,
  initialPage = 1,
  highlights = [],
  onDeleteHighlight
}) {
  const [numPages, setNumPages] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(1.0)
  const containerRef = useRef(null)
  const pageRefs = useRef({})

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1.0)
  }, [])

  // Calculate current page width based on zoom
  const pageWidth = Math.round(BASE_WIDTH * zoom)

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
    if (onPageChange) {
      onPageChange(initialPage, numPages)
    }
  }, [onPageChange, initialPage])

  // Handle document load error
  const onDocumentLoadError = useCallback((error) => {
    console.error('PDF load error:', error)
    setError('Failed to load PDF document')
    setLoading(false)
  }, [])

  // Handle scroll for progress tracking
  const handleScroll = useCallback((e) => {
    if (onScroll) {
      const container = e.target
      onScroll({
        target: {
          scrollTop: container.scrollTop,
          clientHeight: container.clientHeight,
          scrollHeight: container.scrollHeight
        }
      })
    }
  }, [onScroll])

  // Scroll to initial page after document loads (only if not page 1)
  useEffect(() => {
    if (numPages && initialPage > 1) {
      const pageElement = pageRefs.current[initialPage]
      if (pageElement) {
        setTimeout(() => {
          pageElement.scrollIntoView({ behavior: 'auto', block: 'start' })
        }, 100)
      }
    }
  }, [numPages, initialPage])

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No PDF file available
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-auto bg-blue-50 relative"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {/* Zoom controls - fixed position */}
      <div className="sticky top-2 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 px-2 py-1 pointer-events-auto">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomReset}
            className="px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded min-w-[60px] transition-colors"
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 z-10">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading PDF...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center h-full text-red-400">
          {error}
        </div>
      )}

      {/* PDF Document with all pages */}
      <div className="flex flex-col items-center gap-4 py-4 px-4">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex flex-col items-center gap-4"
        >
          {numPages && Array.from({ length: numPages }, (_, index) => {
            const pageNum = index + 1
            const pageHighlights = highlights.filter(h =>
              h.page_number === pageNum || h.pdf_rects?.some(r => r.page === pageNum)
            )
            return (
              <div
                key={`page_${pageNum}`}
                ref={(el) => { pageRefs.current[pageNum] = el }}
                className="relative"
                data-page-number={pageNum}
              >
                <Page
                  pageNumber={pageNum}
                  width={pageWidth}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="border border-gray-900 bg-white"
                />
                {/* Highlight overlay layer */}
                <PDFHighlightLayer
                  pageNumber={pageNum}
                  highlights={pageHighlights}
                  onDeleteHighlight={onDeleteHighlight}
                />
                {/* Page number indicator */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                  {pageNum} / {numPages}
                </div>
              </div>
            )
          })}
        </Document>
      </div>
    </div>
  )
})

export default PDFRenderer
