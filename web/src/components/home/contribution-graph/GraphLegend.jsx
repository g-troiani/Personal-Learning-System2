import { useState } from 'react'
import { getSourceColor, EMPTY_COLOR } from '../../../lib/contributionGraph'

const INTENSITY_PREVIEW_HUE = 270

export default function GraphLegend({ sources, sourceFilter, onSourceFilter }) {
  const [showAll, setShowAll] = useState(false)

  const visibleSources = showAll ? sources : sources.slice(0, 5)
  const hasMore = sources.length > 5

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2 mt-3 text-[11px] text-text-secondary">
      <div className="flex items-center gap-1.5">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: EMPTY_COLOR }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSourceColor(INTENSITY_PREVIEW_HUE, 1) }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSourceColor(INTENSITY_PREVIEW_HUE, 2) }} />
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getSourceColor(INTENSITY_PREVIEW_HUE, 3) }} />
        <span>More</span>
      </div>

      {sources.length >= 2 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {sourceFilter && (
            <button
              onClick={() => onSourceFilter(null)}
              className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Clear filter
            </button>
          )}
          {visibleSources.map(source => {
            const isActive = sourceFilter === source.id
            return (
              <button
                key={source.id}
                onClick={() => onSourceFilter(isActive ? null : source.id)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${
                  isActive ? 'bg-gray-700 ring-1 ring-gray-500' : 'hover:bg-gray-800'
                }`}
                title={source.title}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getSourceColor(source.hue, 2) }}
                />
                <span className="truncate max-w-[120px]">{source.title}</span>
              </button>
            )
          })}
          {hasMore && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="text-accent-progress hover:underline text-[10px]"
            >
              {showAll ? 'Show less' : `+${sources.length - 5} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
