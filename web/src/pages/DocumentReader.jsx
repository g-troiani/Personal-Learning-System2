import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { FileText, ArrowLeft, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import ReaderContent from '../components/reader/ReaderContent'

// API base URL from environment or default to localhost:8001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

export default function DocumentReader() {
  const { sourceId } = useParams()
  const navigate = useNavigate()

  const [source, setSource] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [extractedContent, setExtractedContent] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(null)

  // Handle page change from PDF renderer
  const handlePageChange = (page, total) => {
    setCurrentPage(page)
    setTotalPages(total)
  }

  // Fetch source details and file URL
  useEffect(() => {
    async function fetchData() {
      if (!sourceId) return

      setLoading(true)
      setError(null)

      try {
        // Fetch source status/details
        const statusRes = await fetch(`${API_BASE_URL}/api/sources/${sourceId}/status`)
        if (!statusRes.ok) {
          throw new Error('Source not found')
        }
        const statusData = await statusRes.json()
        setSource(statusData)

        // Fetch extracted content for non-PDF files (Markdown, text)
        try {
          const contentRes = await fetch(`${API_BASE_URL}/api/sources/${sourceId}/content`)
          if (contentRes.ok) {
            const contentData = await contentRes.json()
            setExtractedContent(contentData.content)
          }
        } catch (e) {
          // Content endpoint may not exist, that's ok - we'll use file URL
          console.log('Content endpoint not available, using file URL')
        }

        // Fetch signed URL for the file
        const fileRes = await fetch(`${API_BASE_URL}/api/sources/${sourceId}/file-url`)
        if (fileRes.ok) {
          const fileData = await fileRes.json()
          setFileUrl(fileData.url)
        }

        // Fetch sections (TOC)
        const sectionsRes = await fetch(`${API_BASE_URL}/api/sources/${sourceId}/sections`)
        if (sectionsRes.ok) {
          const sectionsData = await sectionsRes.json()
          setSections(sectionsData.sections || [])
        }

      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sourceId])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading document...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-red-400">
          <AlertCircle className="h-8 w-8" />
          <span>{error}</span>
          <button
            onClick={() => navigate('/sources')}
            className="mt-2 text-sm text-teal-400 hover:text-teal-300"
          >
            Back to Sources
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <Link
            to="/sources"
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-400" />
            <h1 className="text-lg font-medium text-white truncate max-w-md">
              {source?.title || 'Document'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {source && (
            <Link
              to={`/study/${sourceId}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Practice
            </Link>
          )}
        </div>
      </div>

      {/* Document Viewer Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Document Area */}
        <div className="flex-1 overflow-hidden">
          <ReaderContent
            source={source}
            fileUrl={fileUrl}
            extractedContent={extractedContent}
            sections={sections}
            onPageChange={handlePageChange}
          />
        </div>

        {/* Right Panel - Assistant/Notes (placeholder for M35) */}
        <div className="w-80 border-l border-gray-700 bg-gray-800/50 p-4 hidden lg:block">
          <h2 className="text-sm font-medium text-gray-400 mb-3">Assistant</h2>
          <div className="text-sm text-gray-500 text-center py-8">
            AI assistant and notes coming soon...
          </div>
        </div>
      </div>

      {/* Source Info Footer */}
      {source && (
        <div className="px-4 py-2 border-t border-gray-700 text-xs text-gray-500 flex items-center gap-4">
          <span>Domain: {source.domain || 'general'}</span>
          <span>|</span>
          <span>{source.word_count?.toLocaleString() || 0} words</span>
          <span>|</span>
          <span>{source.kc_count || 0} knowledge components</span>
          <span>|</span>
          <span>{source.item_count || 0} practice items</span>
        </div>
      )}
    </div>
  )
}
