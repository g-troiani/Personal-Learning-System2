const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarGrid({ currentDate, selectedDate, onSelectDate, scheduledSessions }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get first day of month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Get last day of month
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()

  // Generate calendar days
  const days = []

  // Empty cells before first day
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  // Check if a date has scheduled sessions
  const getSessionsForDay = (day) => {
    if (!day || !scheduledSessions) return []
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return scheduledSessions.filter(s => s.scheduled_for?.startsWith(dateStr))
  }

  // Check if day is today
  const isToday = (day) => {
    if (!day) return false
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  // Check if day is selected
  const isSelected = (day) => {
    if (!day || !selectedDate) return false
    return (
      day === selectedDate.getDate() &&
      currentDate.getMonth() === selectedDate.getMonth() &&
      currentDate.getFullYear() === selectedDate.getFullYear()
    )
  }

  return (
    <div className="bg-bg-card rounded-card border border-bg-card-border p-4">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map(name => (
          <div
            key={name}
            className="text-center text-sm font-medium text-text-secondary py-2"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          const sessions = getSessionsForDay(day)
          const hasSession = sessions.length > 0

          return (
            <button
              key={index}
              onClick={() => day && onSelectDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
              disabled={!day}
              className={`
                aspect-square p-2 rounded-button text-sm font-medium transition-colors relative
                ${!day ? 'cursor-default' : 'hover:bg-gray-100 cursor-pointer'}
                ${isToday(day) ? 'bg-accent-progress text-white hover:bg-accent-progress' : ''}
                ${isSelected(day) && !isToday(day) ? 'bg-gray-200' : ''}
                ${day && !isToday(day) && !isSelected(day) ? 'text-text-primary' : ''}
              `}
            >
              {day}
              {hasSession && (
                <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-accent-alert rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
