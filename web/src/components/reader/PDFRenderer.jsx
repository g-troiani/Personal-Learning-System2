import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Import required CSS for text layer
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

/**
 * PDF Renderer component using react-pdf with text layer enabled.
 * Shows one page at a time with navigation controls.
 * Memoized to prevent unnecessary re-renders.
 *
 * @param {string} fileUrl - Signed URL to the PDF file
 * @param {Function} onPageChange - Callback when page changes (page, totalPages)
 * @param {number} initialPage - Page number to start on (default: 1)
 */
const PDFRenderer = memo(function PDFRenderer({ fileUrl, onPageChange, initialPage = 1 }) {
  const [numPages, setNumPages] = useState(null)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scale, setScale] = useState(1.0)
  const containerRef = useRef(null)

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

  // Page navigation
  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => {
      const newPage = Math.max(1, prev - 1)
      if (onPageChange && numPages) {
        onPageChange(newPage, numPages)
      }
      return newPage
    })
  }, [numPages, onPageChange])

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => {
      const newPage = Math.min(numPages || 1, prev + 1)
      if (onPageChange && numPages) {
        onPageChange(newPage, numPages)
      }
      return newPage
    })
  }, [numPages, onPageChange])

  const goToPage = useCallback((page) => {
    const pageNum = Math.max(1, Math.min(numPages || 1, page))
    setCurrentPage(pageNum)
    if (onPageChange && numPages) {
      onPageChange(pageNum, numPages)
    }
  }, [numPages, onPageChange])

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(2.0, prev + 0.1))
  }, [])

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.5, prev - 0.1))
  }, [])

  // Listen for scroll-to-section events
  useEffect(() => {
    const handleScrollToSection = (event) => {
      const { pageNumber: targetPage } = event.detail
      if (targetPage && numPages) {
        goToPage(targetPage)
      }
    }

    window.addEventListener('scroll-to-section', handleScrollToSection)
    return () => {
      window.removeEventListener('scroll-to-section', handleScrollToSection)
    }
  }, [numPages, goToPage])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPreviousPage()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNextPage()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPreviousPage, goToNextPage])

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No PDF file available
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-2 py-1 text-center border border-gray-300 rounded"
              min={1}
              max={numPages || 1}
            />
            <span className="text-gray-500">/ {numPages || '...'}</span>
          </div>
          <button
            onClick={goToNextPage}
            disabled={currentPage >= (numPages || 1)}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 2.0}
            className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* PDF content */}
      <div className="flex-1 overflow-auto bg-gray-200 p-4" ref={containerRef}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Loading PDF...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full text-red-400">
            {error}
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex justify-center"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg bg-white"
          />
        </Document>
      </div>
    </div>
  )
})

export default PDFRenderer
