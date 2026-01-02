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

export default function SourceItem({ source, count, category }) {
  const navigate = useNavigate()
  const emoji = getSourceEmoji(source)

  // Determine status text based on category
  const getStatusText = () => {
    if (category === 'overdue') {
      return `${count} item${count !== 1 ? 's' : ''} overdue`
    } else if (category === 'dueToday') {
      return `${count} item${count !== 1 ? 's' : ''} due`
    } else {
      return `${count} item${count !== 1 ? 's' : ''} not yet practiced`
    }
  }

  // Determine button text based on category
  const getButtonText = () => {
    if (category === 'overdue') return 'Review'
    if (category === 'dueToday') return 'Study'
    return 'Start'
  }

  // Determine button style based on category
  const getButtonStyle = () => {
    if (category === 'overdue') {
      return 'bg-accent-overdue text-white hover:bg-red-600'
    } else if (category === 'dueToday') {
      return 'bg-accent-alert text-white hover:bg-amber-600'
    } else {
      return 'bg-accent-new text-white hover:bg-blue-600'
    }
  }

  const handleClick = () => {
    navigate(`/study?source=${source.id}`)
  }

  // Truncate title if too long
  const truncatedTitle = source.title?.length > 40
    ? source.title.substring(0, 40) + '...'
    : source.title

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-bg-card border border-bg-card-border rounded-button hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-text-primary truncate" title={source.title}>
            {truncatedTitle}
          </h4>
          <p className="text-sm text-text-secondary">
            {getStatusText()}
          </p>
        </div>
      </div>
      <button
        onClick={handleClick}
        className={`px-4 py-2 rounded-button font-medium text-sm transition-colors flex-shrink-0 ml-4 ${getButtonStyle()}`}
      >
        {getButtonText()}
      </button>
    </div>
  )
}
