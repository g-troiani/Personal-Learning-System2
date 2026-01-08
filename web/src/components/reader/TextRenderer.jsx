import { useState, useEffect, useRef, useMemo, memo } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Plain text renderer component.
 * Displays text content with proper formatting and line numbers.
 * Memoized to prevent unnecessary re-renders.
 *
 * @param {string} fileUrl - URL to fetch text content from (optional)
 * @param {string} content - Direct text content (preferred over fileUrl)
 */
const TextRenderer = memo(function TextRenderer({ fileUrl, content: directContent }) {
  const [content, setContent] = useState(directContent || '')
  const [loading, setLoading] = useState(!directContent)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)

  // Fetch content from URL if not provided directly
  useEffect(() => {
    if (directContent) {
      setContent(directContent)
      setLoading(false)
      return
    }

    if (!fileUrl) {
      setError('No content available')
      setLoading(false)
      return
    }

    const fetchContent = async () => {
      setLoading(true)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`)
        }
        const text = await response.text()
        setContent(text)
        setError(null)
      } catch (err) {
        console.error('Text fetch error:', err)
        setError('Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [fileUrl, directContent])

  // Listen for scroll-to-section events
  useEffect(() => {
    const handleScrollToSection = (event) => {
      const { scrollPosition } = event.detail

      if (scrollPosition !== undefined && containerRef.current) {
        containerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
      }
    }

    window.addEventListener('scroll-to-section', handleScrollToSection)
    return () => {
      window.removeEventListener('scroll-to-section', handleScrollToSection)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading document...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    )
  }

  // Memoize line splitting to prevent recalculation on every render
  const lines = useMemo(() => content.split('\n'), [content])

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-blue-50 flex justify-center"
    >
      <div className="p-4 md:p-6 max-w-6xl w-full">
        <pre className="font-mono text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {lines.map((line, index) => (
            <div key={index} className="flex hover:bg-gray-200/50 -mx-2 px-2 rounded">
              <span className="select-none text-gray-400 w-12 pr-4 text-right shrink-0 border-r border-gray-300 mr-4">
                {index + 1}
              </span>
              <span className="flex-1">{line || '\u00A0'}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
})

export default TextRenderer
