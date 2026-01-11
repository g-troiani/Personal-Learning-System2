import { useState, useEffect, useRef, memo, useCallback } from 'react'
import { renderAsync } from 'docx-preview'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import AnnotationLayer from './AnnotationLayer'

// Zoom levels
const ZOOM_STEP = 0.1
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0

// Import DOCX-specific styles
import '../../styles/docx.css'

/**
 * DOCX Renderer component using docx-preview for high-fidelity rendering.
 * Renders DOCX files with full formatting: headings, tables, images, colors.
 * Memoized to prevent unnecessary re-renders.
 *
 * @param {string} fileUrl - Signed URL to the DOCX file
 * @param {Array} highlights - Highlight annotations to display
 * @param {Function} onDeleteHighlight - Callback when highlight is deleted
 */
const DOCXRenderer = memo(function DOCXRenderer({
  fileUrl,
  highlights = [],
  onDeleteHighlight
}) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rendered, setRendered] = useState(false)
  const [zoom, setZoom] = useState(1.0)

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

  useEffect(() => {
    if (!fileUrl) {
      setError('No document URL provided')
      setLoading(false)
      return
    }

    let cancelled = false

    async function render() {
      setLoading(true)
      setError(null)
      setRendered(false)

      try {
        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`)
        }

        const arrayBuffer = await response.arrayBuffer()

        if (cancelled || !containerRef.current) return

        // Clear previous content
        containerRef.current.innerHTML = ''

        await renderAsync(arrayBuffer, containerRef.current, containerRef.current, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: false,
          useBase64URL: true,
          className: 'docx-wrapper',
          renderHeaders: false,
          renderFooters: false
        })

        if (cancelled) return

        // Store reference to the rendered content for AnnotationLayer
        contentRef.current = containerRef.current

        setLoading(false)
        setRendered(true)
      } catch (err) {
        if (cancelled) return
        console.error('DOCX render error:', err)
        setError('Failed to render document. The file may be corrupted or in an unsupported format.')
        setLoading(false)
      }
    }

    render()

    return () => {
      cancelled = true
    }
  }, [fileUrl])

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500 p-8 text-center bg-gray-50">
        <div className="max-w-md">
          <p className="text-lg mb-2">{error}</p>
          <p className="text-sm text-gray-500">
            Try downloading the file to view it in Microsoft Word or another office application.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-blue-50">
      {/* Zoom controls - fixed toolbar above content */}
      <div className="flex-shrink-0 flex justify-center py-2 bg-blue-50">
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 px-2 py-1">
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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-auto relative">
        {/* Loading overlay - shown on top while rendering */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50 z-10">
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Rendering document...</span>
            </div>
          </div>
        )}

          <div className="flex justify-center py-6 px-4">
          <div
            ref={containerRef}
            className="docx-container bg-white max-w-4xl w-full origin-top transition-transform duration-150"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>

        {/* Annotation layer for highlights - only render after DOCX is loaded */}
        {rendered && contentRef.current && (
          <AnnotationLayer
            highlights={highlights}
            containerRef={contentRef}
            onDeleteHighlight={onDeleteHighlight}
          />
        )}
      </div>
    </div>
  )
})

export default DOCXRenderer
