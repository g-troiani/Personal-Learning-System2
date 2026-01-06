import { useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

/**
 * Table of Contents section for the sidebar.
 * Displays document sections with collapsible behavior and click-to-scroll functionality.
 *
 * @param {Array} sections - Array of section objects { id, title, level, scroll_position, page_number }
 * @param {boolean} loading - Whether sections are being loaded
 */
export default function TableOfContentsSection({ sections = [], loading = false }) {
  const [expanded, setExpanded] = useState(true)

  // Dispatch custom event to scroll document to section
  const handleSectionClick = (section) => {
    window.dispatchEvent(new CustomEvent('scroll-to-section', {
      detail: {
        sectionId: section.id,
        scrollPosition: section.scroll_position,
        pageNumber: section.page_number,
        title: section.title
      }
    }))
  }

  // Toggle collapse/expand
  const toggleExpanded = () => {
    setExpanded(prev => !prev)
  }

  // If no sections and not loading, don't render anything
  if (!loading && sections.length === 0) {
    return null
  }

  return (
    <div className="mt-8">
      {/* Header with toggle */}
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-2 px-3 w-full text-left group"
      >
        <span className="text-text-muted group-hover:text-text-secondary transition-colors">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <h3 className="text-xs font-medium text-accent-progress uppercase tracking-wider">
          Contents
        </h3>
        {loading && (
          <Loader2 className="h-3 w-3 animate-spin text-text-muted ml-auto" />
        )}
      </button>

      {/* Section list - collapsible */}
      {expanded && (
        <ul className="space-y-0.5 mt-2 max-h-64 overflow-y-auto">
          {sections.map(section => (
            <li key={section.id}>
              <button
                onClick={() => handleSectionClick(section)}
                className={`
                  w-full text-left px-3 py-1.5 text-sm text-text-secondary
                  hover:bg-btn-secondary/50 hover:text-text-primary
                  rounded-lg transition-colors truncate
                  ${section.level === 1 ? 'font-medium' : ''}
                `}
                style={{
                  paddingLeft: `${0.75 + (section.level - 1) * 0.75}rem`
                }}
                title={section.title}
              >
                {section.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
