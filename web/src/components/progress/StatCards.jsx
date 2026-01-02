import { BookOpen, Brain, Target, Clock } from 'lucide-react'

function StatCard({ icon, label, value, iconColor }) {
  const IconComponent = icon
  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-button flex items-center justify-center ${iconColor}`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-semibold text-text-primary">{value}</div>
      <div className="text-sm text-text-secondary mt-1">{label}</div>
    </div>
  )
}

function formatTime(minutes) {
  if (!minutes || minutes === 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export default function StatCards({ sourcesCount, itemsLearned, sessionsCount, totalMinutes }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={BookOpen}
        label="Sources"
        value={sourcesCount}
        iconColor="bg-blue-100 text-accent-new"
      />
      <StatCard
        icon={Brain}
        label="Items Learned"
        value={itemsLearned}
        iconColor="bg-green-100 text-accent-progress"
      />
      <StatCard
        icon={Target}
        label="Study Sessions"
        value={sessionsCount}
        iconColor="bg-amber-100 text-accent-alert"
      />
      <StatCard
        icon={Clock}
        label="Total Time"
        value={formatTime(totalMinutes)}
        iconColor="bg-purple-100 text-purple-600"
      />
    </div>
  )
}
