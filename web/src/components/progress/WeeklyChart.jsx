import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { Flame } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyChart({ weeklyData, streak, weeklyTotal }) {
  // weeklyData should be an array of 7 numbers (items practiced per day, Mon-Sun)
  // If not provided, default to zeros
  const data = DAYS.map((day, index) => ({
    day,
    items: weeklyData?.[index] || 0
  }))

  // Get today's day index (0 = Monday, 6 = Sunday)
  const today = new Date()
  // JavaScript getDay: 0=Sunday, 1=Monday, etc.
  // We want Monday=0, so adjust
  const jsDay = today.getDay()
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1

  // Find max value for scaling
  const maxItems = Math.max(...data.map(d => d.items), 1)

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-text-primary">This Week</h2>
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-1 text-accent-alert">
              <Flame className="w-5 h-5" />
              <span className="font-medium">{streak} day streak</span>
            </div>
          )}
          <div className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">{weeklyTotal}</span> items this week
          </div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              width={40}
              domain={[0, maxItems]}
              allowDecimals={false}
            />
            <Bar
              dataKey="items"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === todayIndex ? '#10B981' : '#E5E7EB'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {weeklyTotal === 0 && (
        <p className="text-center text-text-muted text-sm mt-4">
          No activity this week. Start a study session to see your progress!
        </p>
      )}
    </div>
  )
}
