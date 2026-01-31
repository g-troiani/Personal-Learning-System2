import { getSourceColor, getSourceHue, getIntensityLevel } from '../../../lib/contributionGraph'

export default function GraphTooltip({ tooltip, sources }) {
  if (!tooltip) return null

  const { cell, rect } = tooltip

  const formattedDate = new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  const sourceEntries = Object.entries(cell.bySource || {}).sort((a, b) => b[1] - a[1])

  const sourceMap = {}
  if (sources) {
    sources.forEach(s => { sourceMap[s.id] = s })
  }

  return (
    <div
      className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg pointer-events-none"
      style={{
        left: `${rect.left + rect.width / 2}px`,
        top: `${rect.top - 8}px`,
        transform: 'translate(-50%, -100%)',
        minWidth: '140px',
        maxWidth: '220px',
      }}
    >
      <div className="font-medium mb-1">{formattedDate}</div>
      <div className="text-gray-300">
        {cell.count === 0
          ? 'No practice'
          : `${cell.count} practice ${cell.count === 1 ? 'attempt' : 'attempts'}`}
      </div>
      {sourceEntries.length > 0 && cell.count > 0 && (
        <div className="mt-1 pt-1 border-t border-gray-700 space-y-0.5">
          {sourceEntries.map(([sourceId, count]) => {
            const source = sourceMap[sourceId]
            const hue = source?.hue ?? getSourceHue(sourceId)
            const color = getSourceColor(hue, getIntensityLevel(count))
            const title = source?.title || (sourceId === 'unknown' ? 'Unknown source' : sourceId)
            return (
              <div key={sourceId} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{title}</span>
                <span className="text-gray-400 ml-auto flex-shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
