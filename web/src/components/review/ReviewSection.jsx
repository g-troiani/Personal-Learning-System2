import SourceItem from './SourceItem'

export default function ReviewSection({ title, sources, category, dotColor }) {
  if (!sources || sources.length === 0) {
    return null
  }

  // Determine dot color class based on category
  const getDotColorClass = () => {
    switch (dotColor) {
      case 'red':
        return 'bg-accent-overdue'
      case 'amber':
        return 'bg-accent-alert'
      case 'green':
        return 'bg-accent-progress'
      case 'blue':
        return 'bg-accent-new'
      default:
        return 'bg-text-secondary'
    }
  }

  // Get count property based on category
  const getCount = (source) => {
    if (category === 'overdue') return source.overdue
    if (category === 'dueToday') return source.dueToday
    return source.newContent
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-3 h-3 rounded-full ${getDotColorClass()}`}></span>
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="space-y-3">
        {sources.map(source => (
          <SourceItem
            key={source.id}
            source={source}
            count={getCount(source)}
            category={category}
          />
        ))}
      </div>
    </div>
  )
}
