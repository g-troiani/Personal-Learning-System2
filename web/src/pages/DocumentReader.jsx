import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { FileText, ArrowLeft, Loader2, AlertCircle, BookOpen, CheckCircle, Maximize2, Minimize2 } from 'lucide-react'
import ReaderContent from '../components/reader/ReaderContent'
import SelectionTooltip from '../components/reader/SelectionTooltip'
import AssistantPanel from '../components/reader/AssistantPanel'
import { useTextSelection } from '../hooks/useTextSelection'
import { useAnnotations } from '../hooks/useAnnotations'
import { useReadingProgress } from '../hooks/useReadingProgress'
import { useZenMode } from '../contexts/ZenModeContext'
import { getSourceStatus, getFileUrl, getPdfUrl, getSections, getContent } from '../lib/api'

export default function DocumentReader() {
  const { sourceId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentContainerRef = useRef(null)
  const { isZenMode, toggleZenMode } = useZenMode()

  // Get initial page from URL params (for deep linking)
  const urlPage = parseInt(searchParams.get('page'), 10) || null

  const [source, setSource] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null)
  const [extractedContent, setExtractedContent] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentPage, setCurrentPage] = useState(urlPage || 1)
  const [totalPages, setTotalPages] = useState(null)

  // Text selection and annotations hooks
  const { selection, clearSelection } = useTextSelection(contentContainerRef)
  const {
    highlights,
    notes,
    createHighlight,
    createNote,
    deleteAnnotation
  } = useAnnotations(sourceId)

  // AI chat state
  const [aiInitialMessage, setAiInitialMessage] = useState(null)

  // Reading progress tracking
  const {
    progress: readingProgress,
    updateScrollPosition,
    updatePage,
    forceSave
  } = useReadingProgress(sourceId, { totalPages })

  // Handle page change from PDF renderer - update state and URL
  const handlePageChange = useCallback((page, total) => {
    setCurrentPage(page)
    setTotalPages(total)
    updatePage(page, total)

    // Update URL with page number for deep linking (without navigation)
    const newParams = new URLSearchParams(searchParams)
    if (page > 1) {
      newParams.set('page', page.toString())
    } else {
      newParams.delete('page') // Don't clutter URL for page 1
    }
    setSearchParams(newParams, { replace: true })
  }, [updatePage, searchParams, setSearchParams])

  // Handle scroll tracking for non-PDF content
  const handleScroll = useCallback((event) => {
    const container = event.target
    if (container) {
      updateScrollPosition(
        container.scrollTop,
        container.clientHeight,
        container.scrollHeight
      )
    }
  }, [updateScrollPosition])

  // Save progress before leaving
  useEffect(() => {
    return () => {
      forceSave()
    }
  }, [forceSave])

  // ESC key exits zen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isZenMode) {
        toggleZenMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isZenMode, toggleZenMode])

  // Handle highlight creation
  const handleHighlight = useCallback(async (sel, color) => {
    if (sel) {
      await createHighlight(sel, color)
      clearSelection()
    }
  }, [createHighlight, clearSelection])

  // Handle "Ask AI" action - sends selected text to AI chat
  const handleAskAI = useCallback((text) => {
    setAiInitialMessage(text)
    clearSelection()
  }, [clearSelection])


  // Handle highlight deletion
  const handleDeleteHighlight = useCallback(async (annotationId) => {
    await deleteAnnotation(annotationId)
  }, [deleteAnnotation])

  // Handle note creation
  const handleCreateNote = useCallback(async (noteText) => {
    await createNote(null, noteText) // null selection for standalone note
  }, [createNote])

  // Handle note deletion
  const handleDeleteNote = useCallback(async (annotationId) => {
    await deleteAnnotation(annotationId)
  }, [deleteAnnotation])

  // Clear AI initial message after it's been used
  const handleClearAiMessage = useCallback(() => {
    setAiInitialMessage(null)
  }, [])

  // Fetch source details and file URL
  useEffect(() => {
    async function fetchData() {
      if (!sourceId) return

      setLoading(true)
      setError(null)

      try {
        // Fetch source status/details (uses authenticated api.js)
        const statusData = await getSourceStatus(sourceId)
        setSource(statusData)

        // Fetch extracted content for non-PDF files (Markdown, text)
        try {
          const contentData = await getContent(sourceId)
          setExtractedContent(contentData.content)
        } catch (e) {
          // Content endpoint may not exist, that's ok - we'll use file URL
          console.log('Content endpoint not available, using file URL')
        }

        // Fetch signed URL for the file
        try {
          const fileData = await getFileUrl(sourceId)
          setFileUrl(fileData.url)
        } catch (e) {
          console.log('File URL not available')
        }

        // For PPTX sources, also fetch the converted PDF URL
        const title = statusData?.title || ''
        const ext = title.toLowerCase().split('.').pop()
        if (ext === 'pptx' || ext === 'ppt') {
          try {
            const pdfData = await getPdfUrl(sourceId)
            setConvertedPdfUrl(pdfData.url)
          } catch (e) {
            // PDF conversion may not be available, continue without it
            console.log('Converted PDF not available for PPTX source')
          }
        }

        // Fetch sections (TOC)
        try {
          const sectionsData = await getSections(sourceId)
          setSections(sectionsData.sections || [])
        } catch (e) {
          console.log('Sections not available')
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
    <div className="h-full flex bg-gray-100">
      {/* Left section - main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header - left part */}
        <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center gap-3 flex-1">
            <Link
              to="/sources"
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              <h1 className="text-lg font-medium text-gray-800 truncate max-w-md">
                {source?.title || 'Document'}
              </h1>
            </div>
            {/* Spacer */}
            <div className="w-96" />
            {/* Reading Progress Indicator */}
            {readingProgress.completionPercentage > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-500">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  <span className="text-teal-600 font-medium">
                    {readingProgress.completionPercentage}%
                  </span>
                  <span className="text-gray-400">read</span>
                </div>
                {/* Progress bar */}
                <div className="w-20 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${readingProgress.completionPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Show tools button - only visible in zen mode */}
          {isZenMode && (
            <button
              onClick={toggleZenMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors bg-teal-600 hover:bg-teal-500 text-white"
              title="Show tools and sidebar"
            >
              <Minimize2 className="h-4 w-4" />
              <span>Show tools</span>
            </button>
          )}
        </div>

        {/* Document Viewer */}
        <div
          ref={contentContainerRef}
          className="flex-1 overflow-hidden relative"
          onScroll={handleScroll}
        >
          <ReaderContent
            source={source}
            fileUrl={fileUrl}
            convertedPdfUrl={convertedPdfUrl}
            extractedContent={extractedContent}
            sections={sections}
            onPageChange={handlePageChange}
            highlights={highlights}
            onDeleteHighlight={handleDeleteHighlight}
            initialScrollPosition={readingProgress.scrollPosition}
            initialPage={urlPage || readingProgress.currentPage}
            onScroll={handleScroll}
          />

          {/* Selection Tooltip - appears when text is selected */}
          <SelectionTooltip
            selection={selection}
            onAskAI={handleAskAI}
            onHighlight={handleHighlight}
            onClose={clearSelection}
          />
        </div>

        {/* Source Info Footer (hidden in zen mode) */}
        {source && !isZenMode && (
          <div className="px-4 py-2 border-t border-gray-300 bg-gray-50 text-xs text-gray-500 flex items-center gap-4">
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

      {/* Right panel column - full height with border-l (hidden in zen mode) */}
      {!isZenMode && (
        <div className="hidden lg:flex flex-col border-l border-gray-300">
          {/* Header - right part */}
          <div className="p-4 border-b border-gray-300 bg-gray-50 flex items-center gap-3">
            <button
              onClick={toggleZenMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors bg-teal-50 border border-teal-300 text-teal-700 hover:bg-teal-100"
              title="Hide tools for distraction-free reading"
            >
              <Maximize2 className="h-4 w-4" />
              <span>Hide tools</span>
            </button>
            <Link
              to={`/study/${sourceId}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-sm transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Practice
            </Link>
          </div>

          {/* Assistant Panel */}
          <div className="flex-1 overflow-hidden">
            <AssistantPanel
              sourceId={sourceId}
              source={source}
              notes={notes}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              initialMessage={aiInitialMessage}
              onClearInitialMessage={handleClearAiMessage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
