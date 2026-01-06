import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { Loader2 } from 'lucide-react'
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
  const containerRef = useRef(null)
  const pageRefs = useRef({})

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
      className="h-full overflow-auto bg-gray-200"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
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
                  width={800}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-lg bg-white"
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
