import { useMemo, useEffect, useRef, memo, useCallback } from 'react'
import { FileText, AlertCircle, ExternalLink } from 'lucide-react'
import PDFRenderer from './PDFRenderer'
import MarkdownRenderer from './MarkdownRenderer'
import TextRenderer from './TextRenderer'
import DOCXRenderer from './DOCXRenderer'

/**
 * Content type detection based on mime type and filename
 */
function getContentType(mimeType, title) {
  // Check filename extension first (more reliable for existing uploads)
  if (title) {
    const ext = title.toLowerCase().split('.').pop()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'md' || ext === 'markdown') return 'markdown'
    if (ext === 'txt') return 'text'
    if (ext === 'docx' || ext === 'doc') return 'docx' // DOCX renders with full fidelity
    if (ext === 'pptx' || ext === 'ppt') return 'pptx' // PPTX renders via converted PDF
  }

  if (!mimeType) return 'unknown'

  // PDF detection
  if (mimeType.includes('pdf')) return 'pdf'

  // Markdown detection
  if (mimeType.includes('markdown') || mimeType === 'text/x-markdown') return 'markdown'

  // Plain text
  if (mimeType.includes('text/plain')) return 'text'

  // DOCX (renders with full fidelity via docx-preview)
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'docx'

  // PPTX (renders via converted PDF)
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx'

  return 'unknown'
}

/**
 * Reader Content container that selects the appropriate renderer
 * based on the source's mime type.
 *
 * @param {Object} source - Source object with mime_type and other metadata
 * @param {string} fileUrl - Signed URL to the file
 * @param {string} convertedPdfUrl - Signed URL to converted PDF (for PPTX sources)
 * @param {string} extractedContent - Text content extracted during ingestion
 * @param {Array} sections - TOC sections for navigation
 * @param {Function} onPageChange - Callback for PDF page changes
 * @param {Array} highlights - Highlight annotations to display
 * @param {Function} onDeleteHighlight - Callback when highlight is deleted
 * @param {number} initialScrollPosition - Scroll position to restore
 * @param {number} initialPage - Page number to restore (for PDFs)
 * @param {Function} onScroll - Callback for scroll tracking
 */
const ReaderContent = memo(function ReaderContent({
  source,
  fileUrl,
  convertedPdfUrl,
  extractedContent,
  sections = [],
  onPageChange,
  highlights = [],
  onDeleteHighlight,
  initialScrollPosition = 0,
  initialPage = 1,
  onScroll
}) {
  const scrollContainerRef = useRef(null)
  const hasRestoredPosition = useRef(false)

  // Determine content type FIRST (other hooks depend on this)
  const contentType = useMemo(() => {
    return getContentType(source?.mime_type, source?.title)
  }, [source?.mime_type, source?.title])

  // Restore scroll position on mount (only once)
  useEffect(() => {
    if (
      initialScrollPosition > 0 &&
      !hasRestoredPosition.current &&
      scrollContainerRef.current &&
      contentType !== 'pdf' // PDF handles its own page restoration
    ) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = initialScrollPosition
          hasRestoredPosition.current = true
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [initialScrollPosition, contentType])

  // Render appropriate renderer based on content type
  const renderContent = () => {
    switch (contentType) {
      case 'pdf':
        if (!fileUrl) {
          return (
            <FallbackView
              message="PDF file not available"
              hint="The original file may have been uploaded before file storage was enabled."
            />
          )
        }
        return (
          <PDFRenderer
            fileUrl={fileUrl}
            onPageChange={onPageChange}
            onScroll={onScroll}
            initialPage={initialPage}
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
          />
        )

      case 'markdown':
        // Prefer extracted content for markdown (already parsed), fallback to file URL
        return (
          <MarkdownRenderer
            content={extractedContent}
            fileUrl={fileUrl}
            sections={sections}
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
          />
        )

      case 'docx':
        // DOCX renders with full fidelity via docx-preview
        if (!fileUrl) {
          return (
            <FallbackView
              message="Document file not available"
              hint="The original file may have been uploaded before file storage was enabled."
            />
          )
        }
        return (
          <DOCXRenderer
            fileUrl={fileUrl}
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
          />
        )

      case 'text':
        // Use extracted content for text files
        return (
          <TextRenderer
            content={extractedContent}
            fileUrl={fileUrl}
            highlights={highlights}
            onDeleteHighlight={onDeleteHighlight}
          />
        )

      case 'pptx':
        // PPTX renders via converted PDF
        if (convertedPdfUrl) {
          return (
            <PDFRenderer
              fileUrl={convertedPdfUrl}
              onPageChange={onPageChange}
              onScroll={onScroll}
              initialPage={initialPage}
              highlights={highlights}
              onDeleteHighlight={onDeleteHighlight}
            />
          )
        }
        // Fallback: show extracted text if PDF conversion not available
        if (extractedContent) {
          return (
            <div className="p-4">
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <strong>Note:</strong> PDF conversion not available. Showing extracted slide content.
              </div>
              <TextRenderer
                content={extractedContent}
                highlights={highlights}
                onDeleteHighlight={onDeleteHighlight}
              />
            </div>
          )
        }
        return (
          <FallbackView
            message="PowerPoint presentation not available"
            hint="The presentation could not be converted for viewing."
            fileUrl={fileUrl}
            mimeType={source?.mime_type}
          />
        )

      case 'unknown':
      default:
        // Fallback: show link to open in new tab if URL available
        if (fileUrl) {
          return (
            <FallbackView
              message="Document preview not available for this file type."
              fileUrl={fileUrl}
              mimeType={source?.mime_type}
            />
          )
        }
        return (
          <FallbackView
            message="No file available for this document."
            hint="The content has been extracted and you can practice with the generated questions."
          />
        )
    }
  }

  // For PDF, DOCX, and PPTX (as PDF), render directly (has its own scroll handling)
  if (contentType === 'pdf' || contentType === 'docx' || contentType === 'pptx') {
    return (
      <div className="h-full flex flex-col">
        {renderContent()}
      </div>
    )
  }

  // For non-PDF content, wrap in scrollable container with tracking
  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto"
      onScroll={onScroll}
    >
      {renderContent()}
    </div>
  )
})

/**
 * Fallback view when document cannot be rendered
 * Memoized to prevent unnecessary re-renders
 */
const FallbackView = memo(function FallbackView({ message, hint, fileUrl, mimeType }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 p-8 bg-gray-50">
      <div className="bg-white rounded-lg p-8 max-w-md text-center border border-gray-300 shadow-sm">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-lg text-gray-700 mb-2">{message}</p>
        {hint && (
          <p className="text-sm text-gray-500 mb-4">{hint}</p>
        )}
        {mimeType && (
          <p className="text-xs text-gray-400 mb-4">
            File type: {mimeType}
          </p>
        )}
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open in new tab
          </a>
        )}
      </div>
    </div>
  )
})

export default ReaderContent
