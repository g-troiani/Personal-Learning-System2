import { useNavigate } from 'react-router-dom'
import { AlertCircle, TrendingDown, Clock, Play } from 'lucide-react'

// Badge color for knowledge types
const TYPE_BADGES = {
  'factual': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  'conceptual': { bg: 'bg-green-100', text: 'text-green-700' },
  'procedural': { bg: 'bg-amber-100', text: 'text-amber-700' },
  'metacognitive': { bg: 'bg-blue-100', text: 'text-blue-700' }
}

export default function ItemsNeedingAttention({ items }) {
  const navigate = useNavigate()

  const handlePractice = (item) => {
    // Navigate to study page with the source
    navigate(`/study?source=${item.sourceId}&kc=${item.kcId}`)
  }

  const getReasonIcon = (reason) => {
    switch (reason) {
      case 'struggling':
        return <TrendingDown className="w-4 h-4 text-accent-overdue" />
      case 'low_mastery':
        return <AlertCircle className="w-4 h-4 text-accent-alert" />
      case 'overdue':
        return <Clock className="w-4 h-4 text-accent-alert" />
      default:
        return <AlertCircle className="w-4 h-4 text-text-muted" />
    }
  }

  const getReasonText = (reason) => {
    switch (reason) {
      case 'struggling':
        return 'Marked as struggling'
      case 'low_mastery':
        return 'Low mastery level'
      case 'overdue':
        return 'Overdue for review'
      case 'high_difficulty':
        return 'High difficulty rating'
      default:
        return 'Needs attention'
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-bg-card border border-bg-card-border rounded-card p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Items Needing Attention</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-text-secondary">No items need special attention right now.</p>
          <p className="text-sm text-text-muted mt-1">Keep up the good work!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-card border border-bg-card-border rounded-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Items Needing Attention</h3>
          <p className="text-sm text-text-secondary">{items.length} items flagged for extra practice</p>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.map((item) => {
          const badges = TYPE_BADGES[item.knowledgeType] || { bg: 'bg-gray-100', text: 'text-gray-700' }

          return (
            <div
              key={item.kcId}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-button hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-text-primary truncate" title={item.name}>
                    {item.name}
                  </h4>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${badges.bg} ${badges.text}`}>
                    {item.knowledgeType}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-text-secondary">
                    {getReasonIcon(item.reason)}
                    <span>{getReasonText(item.reason)}</span>
                  </div>

                  {item.mastery !== undefined && (
                    <span className="text-text-muted">
                      Mastery: {Math.round(item.mastery * 100)}%
                    </span>
                  )}

                  {item.avgDifficulty !== undefined && (
                    <span className="text-text-muted">
                      Difficulty: {item.avgDifficulty.toFixed(1)}/5
                    </span>
                  )}
                </div>

                {item.sourceName && (
                  <p className="text-xs text-text-muted mt-1 truncate" title={item.sourceName}>
                    From: {item.sourceName}
                  </p>
                )}
              </div>

              <button
                onClick={() => handlePractice(item)}
                className="flex items-center gap-2 px-4 py-2 bg-btn-primary text-white rounded-button text-sm font-medium hover:bg-gray-800 transition-colors shrink-0"
              >
                <Play className="w-4 h-4" />
                Practice
              </button>
            </div>
          )
        })}
      </div>

      {items.length > 5 && (
        <div className="mt-4 pt-4 border-t border-bg-card-border text-center">
          <p className="text-sm text-text-muted">
            Showing {items.length} items. Focus on the top items first for maximum impact.
          </p>
        </div>
      )}
    </div>
  )
}
