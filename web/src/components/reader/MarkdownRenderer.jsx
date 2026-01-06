import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Loader2 } from 'lucide-react'
import AnnotationLayer from './AnnotationLayer'

// Import highlight.js styles
import 'highlight.js/styles/github-dark.css'

/**
 * Markdown Renderer component using react-markdown with syntax highlighting.
 * Supports GFM (tables, strikethrough, etc.) and code highlighting.
 *
 * @param {string} fileUrl - URL to fetch markdown content from (optional)
 * @param {string} content - Direct markdown content (preferred over fileUrl)
 * @param {Array} sections - TOC sections for scroll-to-section support
 * @param {Array} highlights - Highlight annotations to display
 * @param {Function} onDeleteHighlight - Callback when highlight is deleted
 */
export default function MarkdownRenderer({
  fileUrl,
  content: directContent,
  sections = [],
  highlights = [],
  onDeleteHighlight
}) {
  const [content, setContent] = useState(directContent || '')
  const [loading, setLoading] = useState(!directContent)
  const [error, setError] = useState(null)
  const containerRef = useRef(null)
  const headingRefs = useRef({})

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
        console.error('Markdown fetch error:', err)
        setError('Failed to load document')
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [fileUrl, directContent])

  // Scroll to heading by title
  const scrollToHeading = useCallback((title) => {
    // Try to find heading by text content
    if (containerRef.current) {
      const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
      for (const heading of headings) {
        if (heading.textContent.toLowerCase().includes(title.toLowerCase())) {
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' })
          return
        }
      }
    }
  }, [])

  // Listen for scroll-to-section events
  useEffect(() => {
    const handleScrollToSection = (event) => {
      const { title, scrollPosition } = event.detail

      // Try scrolling by title first
      if (title) {
        scrollToHeading(title)
        return
      }

      // Fallback to scroll position
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
  }, [scrollToHeading])

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

  // Create a ref for the article element (for AnnotationLayer)
  const articleRef = useRef(null)

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto bg-gray-800 rounded-lg relative"
    >
      <article
        ref={articleRef}
        className="prose prose-invert prose-lg max-w-none p-6 md:p-8
        prose-headings:text-white prose-headings:font-semibold
        prose-h1:text-3xl prose-h1:border-b prose-h1:border-gray-700 prose-h1:pb-2 prose-h1:mb-4
        prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
        prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
        prose-p:text-gray-300 prose-p:leading-relaxed
        prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline
        prose-strong:text-white
        prose-code:text-teal-300 prose-code:bg-gray-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg
        prose-ul:text-gray-300 prose-ol:text-gray-300
        prose-li:marker:text-gray-500
        prose-blockquote:border-l-teal-500 prose-blockquote:text-gray-400 prose-blockquote:italic
        prose-table:border-collapse
        prose-th:bg-gray-700 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:border prose-th:border-gray-600
        prose-td:px-4 prose-td:py-2 prose-td:border prose-td:border-gray-700
        prose-hr:border-gray-700
        prose-img:rounded-lg prose-img:shadow-lg
      ">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </article>

      {/* Annotation layer for highlights */}
      <AnnotationLayer
        highlights={highlights}
        containerRef={articleRef}
        onDeleteHighlight={onDeleteHighlight}
      />
    </div>
  )
}
