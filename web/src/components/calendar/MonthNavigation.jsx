import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function MonthNavigation({ currentDate, onPrevMonth, onNextMonth }) {
  const monthName = MONTH_NAMES[currentDate.getMonth()]
  const year = currentDate.getFullYear()

  return (
    <div className="flex items-center justify-between mb-6">
      <button
        onClick={onPrevMonth}
        className="p-2 hover:bg-gray-100 rounded-button transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-text-secondary" />
      </button>

      <h2 className="text-xl font-semibold text-text-primary">
        {monthName} {year}
      </h2>

      <button
        onClick={onNextMonth}
        className="p-2 hover:bg-gray-100 rounded-button transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-text-secondary" />
      </button>
    </div>
  )
}
