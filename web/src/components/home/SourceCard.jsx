import { useNavigate } from 'react-router-dom'

// Source emoji mapping based on domain or custom assignment
const getSourceEmoji = (source) => {
  const domainEmojis = {
    'ai_ml': '🤖',
    'programming': '💻',
    'math': '📐',
    'science': '🔬',
    'history': '📜',
    'language': '📚',
    'business': '💼',
    'health': '🏥',
    'general': '📖',
  }
  return source.emoji || domainEmojis[source.domain] || '📖'
}

export default function SourceCard({ source, mastery, dueCount, overdueCount }) {
  const navigate = useNavigate()
  const emoji = getSourceEmoji(source)
  const masteryPercent = mastery || 0

  // Truncate title if too long
  const truncatedTitle = source.title?.length > 30
    ? source.title.substring(0, 30) + '...'
    : source.title

  const handleClick = () => {
    navigate(`/study?source=${source.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-bg-card border border-bg-card-border rounded-card p-5 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3 mb-4">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate" title={source.title}>
            {truncatedTitle}
          </h3>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-text-muted">Mastery</span>
          <span className="text-sm font-medium text-text-primary">{masteryPercent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-progress rounded-full transition-all duration-300"
            style={{ width: `${masteryPercent}%` }}
          />
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        {overdueCount > 0 && (
          <span className="text-accent-overdue font-medium">
            {overdueCount} overdue
          </span>
        )}
        {dueCount > 0 && (
          <span className="text-accent-alert font-medium">
            {dueCount} due today
          </span>
        )}
        {overdueCount === 0 && dueCount === 0 && (
          <span className="text-accent-progress font-medium">
            All caught up
          </span>
        )}
      </div>
    </div>
  )
}
