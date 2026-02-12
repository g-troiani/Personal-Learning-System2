import { useState, useCallback, useRef } from 'react'
import DayLabels from './DayLabels'
import MonthLabels from './MonthLabels'
import WeekColumn from './WeekColumn'

export default function ContributionGrid({ gridData, weeks, onCellMouseEnter, onCellMouseLeave, onCellFocus }) {
  const [focusedCell, setFocusedCell] = useState(null)
  const gridRef = useRef(null)

  const handleKeyDown = useCallback((e) => {
    if (!gridData || gridData.length === 0) return

    const current = focusedCell || { week: 0, day: 0 }
    let nextWeek = current.week
    let nextDay = current.day

    switch (e.key) {
      case 'ArrowRight':
        nextWeek = Math.min(current.week + 1, gridData.length - 1)
        break
      case 'ArrowLeft':
        nextWeek = Math.max(current.week - 1, 0)
        break
      case 'ArrowDown':
        nextDay = Math.min(current.day + 1, 6)
        break
      case 'ArrowUp':
        nextDay = Math.max(current.day - 1, 0)
        break
      case 'Enter':
      case ' ': {
        e.preventDefault()
        const cell = gridData[current.week]?.[current.day]
        if (cell) {
          const el = document.getElementById(`cell-${current.week}-${current.day}`)
          if (el) onCellFocus?.(cell, el)
        }
        return
      }
      case 'Escape':
        onCellFocus?.(null, null)
        return
      default:
        return
    }

    e.preventDefault()
    setFocusedCell({ week: nextWeek, day: nextDay })
  }, [focusedCell, gridData, onCellFocus])

  const handleFocus = useCallback(() => {
    if (!focusedCell) {
      setFocusedCell({ week: 0, day: 0 })
    }
  }, [focusedCell])

  if (!gridData || gridData.length === 0) return null

  const activeCellId = focusedCell ? `cell-${focusedCell.week}-${focusedCell.day}` : undefined

  return (
    <div>
      <MonthLabels gridData={gridData} />
      <div
        ref={gridRef}
        className="flex overflow-x-auto"
        role="grid"
        aria-label={`Learning activity over the past ${weeks} weeks`}
        tabIndex={0}
        aria-activedescendant={activeCellId}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={() => onCellFocus?.(null, null)}
      >
        <DayLabels />
        <div className="flex" style={{ gap: '2px' }}>
          {gridData.map((week, i) => (
            <WeekColumn
              key={i}
              week={week}
              weekIndex={i}
              focusedCell={focusedCell}
              onCellMouseEnter={onCellMouseEnter}
              onCellMouseLeave={onCellMouseLeave}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
