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

function MasteryBar({ source, mastery, kcCount }) {
  const emoji = getSourceEmoji(source)
  const masteryPercent = Math.round(mastery)

  // Truncate title if too long
  const truncatedTitle = source.title?.length > 40
    ? source.title.substring(0, 40) + '...'
    : source.title

  return (
    <div className="flex items-center gap-4 py-3">
      <span className="text-2xl w-8 text-center flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-text-primary truncate" title={source.title}>
            {truncatedTitle}
          </span>
          <span className="text-sm font-medium text-text-primary ml-2 flex-shrink-0">
            {masteryPercent}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-progress rounded-full transition-all duration-500"
            style={{ width: `${masteryPercent}%` }}
          />
        </div>
        <div className="text-xs text-text-muted mt-1">
          {kcCount} knowledge component{kcCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

export default function MasteryBySource({ sources }) {
  if (!sources || sources.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Mastery by Source</h2>
        <p className="text-text-secondary text-center py-4">
          No sources found. Add a document to get started!
        </p>
      </div>
    )
  }

  // Sort by mastery descending
  const sortedSources = [...sources].sort((a, b) => b.mastery - a.mastery)

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-8">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Mastery by Source</h2>
      <div className="divide-y divide-bg-card-border">
        {sortedSources.map(source => (
          <MasteryBar
            key={source.id}
            source={source}
            mastery={source.mastery}
            kcCount={source.kcCount}
          />
        ))}
      </div>
    </div>
  )
}
