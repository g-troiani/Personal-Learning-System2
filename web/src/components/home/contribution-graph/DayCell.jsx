import { memo } from 'react'
import { EMPTY_COLOR } from '../../../lib/contributionGraph'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatCellLabel(cell) {
  const dayName = DAY_NAMES[cell.dayOfWeek] || ''
  const dateObj = new Date(cell.date + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  if (cell.count === 0) return `${dayName}, ${dateStr}: No practice`
  return `${dayName}, ${dateStr}: ${cell.count} practice ${cell.count === 1 ? 'attempt' : 'attempts'}`
}

function DayCell({ cell, onMouseEnter, onMouseLeave, isFocused, cellId }) {
  if (cell.isFuture) {
    return (
      <div
        id={cellId}
        className="w-[10px] h-[10px] md:w-3 md:h-3 rounded-sm"
        role="gridcell"
        aria-label={`${DAY_NAMES[cell.dayOfWeek] || ''}: Future`}
        style={{ backgroundColor: EMPTY_COLOR, opacity: 0.3 }}
      />
    )
  }

  const label = formatCellLabel(cell)

  return (
    <div
      id={cellId}
      className={`w-[10px] h-[10px] md:w-3 md:h-3 rounded-sm relative cursor-pointer transition-opacity hover:opacity-80 ${
        isFocused ? 'ring-2 ring-accent-progress ring-offset-1 ring-offset-bg-card' : ''
      }`}
      style={{ backgroundColor: cell.color || EMPTY_COLOR }}
      role="gridcell"
      aria-label={label}
      onMouseEnter={(e) => onMouseEnter?.(cell, e.currentTarget)}
      onMouseLeave={onMouseLeave}
    >
      {cell.isMultiSource && cell.count > 0 && (
        <div
          className="absolute bottom-0 right-0 w-[3px] h-[3px] rounded-full bg-white"
          style={{ margin: '1px' }}
        />
      )}
    </div>
  )
}

export default memo(DayCell, (prev, next) =>
  prev.cell.date === next.cell.date &&
  prev.cell.count === next.cell.count &&
  prev.cell.color === next.cell.color &&
  prev.cell.isMultiSource === next.cell.isMultiSource &&
  prev.isFocused === next.isFocused
)
