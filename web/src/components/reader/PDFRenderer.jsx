import { useState, useEffect, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// Import required CSS for text layer
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

/**
 * PDF Renderer component using react-pdf with text layer enabled.
 * Supports page navigation, zoom, and scroll-to-page events.
 *
 * @param {string} fileUrl - Signed URL to the PDF file
 * @param {Function} onPageChange - Callback when page changes (page, totalPages)
 * @param {number} initialPage - Page number to restore (default: 1)
 */
export default function PDFRenderer({ fileUrl, onPageChange, initialPage = 1 }) {
  const [numPages, setNumPages] = useState(null)
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [scale, setScale] = useState(1.0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const pageInputRef = useRef(null)

  // Handle document load success
  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
    // Restore to initial page (clamped to valid range)
    const restoredPage = Math.min(initialPage, numPages)
    setPageNumber(restoredPage)
    if (onPageChange) {
      onPageChange(restoredPage, numPages)
    }
  }, [onPageChange, initialPage])

  // Handle document load error
  const onDocumentLoadError = useCallback((error) => {
    console.error('PDF load error:', error)
    setError('Failed to load PDF document')
    setLoading(false)
  }, [])

  // Navigate to specific page
  const goToPage = useCallback((page) => {
    const targetPage = Math.max(1, Math.min(page, numPages || 1))
    setPageNumber(targetPage)
    if (onPageChange) {
      onPageChange(targetPage, numPages)
    }
  }, [numPages, onPageChange])

  // Navigation handlers
  const previousPage = () => goToPage(pageNumber - 1)
  const nextPage = () => goToPage(pageNumber + 1)

  // Zoom handlers
  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3.0))
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5))

  // Handle page input
  const handlePageInput = (e) => {
    if (e.key === 'Enter') {
      const value = parseInt(e.target.value, 10)
      if (!isNaN(value)) {
        goToPage(value)
      }
    }
  }

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

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No PDF file available
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={previousPage}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-1 text-sm text-gray-300">
            <input
              ref={pageInputRef}
              type="number"
              min={1}
              max={numPages || 1}
              defaultValue={pageNumber}
              key={pageNumber}
              onKeyDown={handlePageInput}
              className="w-12 px-2 py-1 text-center bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-teal-500"
            />
            <span className="text-gray-500">/</span>
            <span>{numPages || '-'}</span>
          </div>
          <button
            onClick={nextPage}
            disabled={pageNumber >= numPages}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            title="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-sm text-gray-400 w-14 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={scale >= 3.0}
            className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-900 p-4"
      >
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
          className="flex flex-col items-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg"
          />
        </Document>
      </div>
    </div>
  )
}
