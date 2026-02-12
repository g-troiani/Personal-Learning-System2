const WEEK_OPTIONS = [
  { value: 12, label: '12w' },
  { value: 26, label: '26w' },
  { value: 52, label: '52w' },
]

export default function GraphHeader({ weeks, onWeeksChange, totalAttempts, activeDays }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
      <div className="flex items-baseline gap-2 sm:gap-3">
        <h3 className="text-sm font-semibold text-text-primary">Practice Activity</h3>
        {totalAttempts > 0 && (
          <span className="text-xs text-text-secondary">
            {totalAttempts} {totalAttempts === 1 ? 'attempt' : 'attempts'} across {activeDays} {activeDays === 1 ? 'day' : 'days'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {WEEK_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onWeeksChange(opt.value)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              weeks === opt.value
                ? 'bg-gray-700 text-text-primary'
                : 'text-text-secondary hover:text-text-primary hover:bg-gray-800'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
