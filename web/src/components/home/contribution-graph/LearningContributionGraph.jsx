import { useState, useCallback, useRef } from 'react'
import { useContributionData } from '../../../hooks/useContributionData'
import GraphHeader from './GraphHeader'
import ContributionGrid from './ContributionGrid'
import GraphLegend from './GraphLegend'
import GraphTooltip from './GraphTooltip'

export default function LearningContributionGraph({ className = '' }) {
  const [weeks, setWeeks] = useState(26)
  const [sourceFilter, setSourceFilter] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const debounceRef = useRef(null)

  const { gridData, sources, loading, error, totalAttempts, activeDays } =
    useContributionData({ weeks, sourceFilter })

  const handleCellMouseEnter = useCallback((cell, element) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const rect = element.getBoundingClientRect()
      setTooltip({ cell, rect })
    }, 80)
  }, [])

  const handleCellMouseLeave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setTooltip(null)
  }, [])

  const handleCellFocus = useCallback((cell, element) => {
    if (!cell || !element) {
      setTooltip(null)
      return
    }
    const rect = element.getBoundingClientRect()
    setTooltip({ cell, rect })
  }, [])

  if (error) {
    return (
      <div className={`bg-bg-card border border-bg-card-border rounded-card p-3 md:p-6 ${className}`}>
        <p className="text-sm text-text-secondary text-center">
          Unable to load practice activity.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-bg-card border border-bg-card-border rounded-card p-3 md:p-6 h-40 animate-pulse ${className}`} />
    )
  }

  const isEmpty = totalAttempts === 0

  return (
    <div className={`bg-bg-card border border-bg-card-border rounded-card p-3 md:p-6 ${className}`}>
      <GraphHeader
        weeks={weeks}
        onWeeksChange={setWeeks}
        totalAttempts={totalAttempts}
        activeDays={activeDays}
      />

      <div className="relative">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-xs md:text-sm text-text-secondary bg-bg-card/80 px-3 py-2 rounded text-center">
              No practice activity yet. Complete a study session to see your activity here.
            </p>
          </div>
        )}
        <div className={isEmpty ? 'opacity-40' : ''}>
          <ContributionGrid
            gridData={gridData}
            weeks={weeks}
            onCellMouseEnter={handleCellMouseEnter}
            onCellMouseLeave={handleCellMouseLeave}
            onCellFocus={handleCellFocus}
          />
        </div>
      </div>

      <GraphLegend
        sources={sources}
        sourceFilter={sourceFilter}
        onSourceFilter={setSourceFilter}
      />

      <GraphTooltip tooltip={tooltip} sources={sources} />
    </div>
  )
}
