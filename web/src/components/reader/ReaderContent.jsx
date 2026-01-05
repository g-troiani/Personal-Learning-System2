import { useMemo } from 'react'
import { FileText, AlertCircle, ExternalLink } from 'lucide-react'
import PDFRenderer from './PDFRenderer'
import MarkdownRenderer from './MarkdownRenderer'
import TextRenderer from './TextRenderer'

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
    if (ext === 'docx' || ext === 'doc') return 'text' // DOCX renders as extracted text
  }

  if (!mimeType) return 'unknown'

  // PDF detection
  if (mimeType.includes('pdf')) return 'pdf'

  // Markdown detection
  if (mimeType.includes('markdown') || mimeType === 'text/x-markdown') return 'markdown'

  // Plain text
  if (mimeType.includes('text/plain')) return 'text'

  // DOCX (will show as text since we extract content)
  if (mimeType.includes('word') || mimeType.includes('officedocument')) return 'text'

  return 'unknown'
}

/**
 * Reader Content container that selects the appropriate renderer
 * based on the source's mime type.
 *
 * @param {Object} source - Source object with mime_type and other metadata
 * @param {string} fileUrl - Signed URL to the file
 * @param {string} extractedContent - Text content extracted during ingestion
 * @param {Array} sections - TOC sections for navigation
 * @param {Function} onPageChange - Callback for PDF page changes
 */
export default function ReaderContent({
  source,
  fileUrl,
  extractedContent,
  sections = [],
  onPageChange
}) {
  // Determine content type
  const contentType = useMemo(() => {
    return getContentType(source?.mime_type, source?.title)
  }, [source?.mime_type, source?.title])

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
          />
        )

      case 'markdown':
        // Prefer extracted content for markdown (already parsed), fallback to file URL
        return (
          <MarkdownRenderer
            content={extractedContent}
            fileUrl={fileUrl}
            sections={sections}
          />
        )

      case 'text':
        // Use extracted content for text files
        return (
          <TextRenderer
            content={extractedContent}
            fileUrl={fileUrl}
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

  return (
    <div className="h-full flex flex-col">
      {renderContent()}
    </div>
  )
}

/**
 * Fallback view when document cannot be rendered
 */
function FallbackView({ message, hint, fileUrl, mimeType }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-4 p-8">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md text-center">
        <FileText className="h-16 w-16 mx-auto mb-4 text-gray-500" />
        <p className="text-lg text-gray-300 mb-2">{message}</p>
        {hint && (
          <p className="text-sm text-gray-500 mb-4">{hint}</p>
        )}
        {mimeType && (
          <p className="text-xs text-gray-600 mb-4">
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
}
