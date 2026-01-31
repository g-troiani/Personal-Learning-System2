import DayCell from './DayCell'

export default function WeekColumn({ week, weekIndex, onCellMouseEnter, onCellMouseLeave, focusedCell }) {
  return (
    <div className="flex flex-col" style={{ gap: '2px' }} role="row">
      {week.map((cell, dayIndex) => {
        const cellId = `cell-${weekIndex}-${dayIndex}`
        const isFocused = focusedCell?.week === weekIndex && focusedCell?.day === dayIndex
        return (
          <DayCell
            key={cell.date}
            cell={cell}
            cellId={cellId}
            isFocused={isFocused}
            onMouseEnter={onCellMouseEnter}
            onMouseLeave={onCellMouseLeave}
          />
        )
      })}
    </div>
  )
}
