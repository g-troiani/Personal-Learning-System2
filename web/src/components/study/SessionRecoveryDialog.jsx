import { RefreshCw, PlayCircle, RotateCcw, Clock, CheckCircle } from 'lucide-react'

/**
 * SessionRecoveryDialog - Modal to resume or start fresh when incomplete session found
 *
 * Shows session progress info and offers choice to resume or start fresh
 */
export default function SessionRecoveryDialog({
  session,
  onResume,
  onStartFresh,
  loading = false
}) {
  if (!session) return null

  // Calculate progress
  const totalItems = session.queueItemIds?.length || 0
  const currentIndex = session.currentIndex || 0
  const itemsCompleted = session.itemsCompleted || 0
  const progress = totalItems > 0 ? Math.round((itemsCompleted / totalItems) * 100) : 0

  // Format last activity time
  const lastActivity = session.last_activity_at || session.paused_at || session.started_at
  const lastActivityDate = new Date(lastActivity)
  const timeAgo = formatTimeAgo(lastActivityDate)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-lg shadow-xl max-w-md w-full p-6 border border-bg-card-border">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Resume Previous Session?
            </h2>
            <p className="text-sm text-text-secondary">
              You have an incomplete study session
            </p>
          </div>
        </div>

        {/* Session info */}
        <div className="bg-bg-main rounded-lg p-4 mb-6 space-y-3">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckCircle className="w-4 h-4" />
              <span>Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-progress rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-medium text-text-primary">
                {itemsCompleted}/{totalItems}
              </span>
            </div>
          </div>

          {/* Last activity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Clock className="w-4 h-4" />
              <span>Last activity</span>
            </div>
            <span className="text-sm text-text-primary">{timeAgo}</span>
          </div>

          {/* Session type */}
          {session.session_type && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Type</span>
              <span className="text-sm text-text-primary capitalize">
                {session.session_type.replace('_', ' ')}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-accent-progress text-white rounded-button font-medium hover:bg-accent-progress/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <PlayCircle className="w-5 h-5" />
            )}
            <span>Resume Session</span>
          </button>

          <button
            onClick={onStartFresh}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-transparent text-text-secondary border border-bg-card-border rounded-button font-medium hover:bg-bg-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Start Fresh</span>
          </button>
        </div>

        {/* Hint */}
        <p className="mt-4 text-xs text-text-secondary text-center">
          Starting fresh will abandon your previous progress
        </p>
      </div>
    </div>
  )
}

/**
 * Format a date as relative time (e.g., "5 minutes ago", "2 hours ago")
 */
function formatTimeAgo(date) {
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'Just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return date.toLocaleDateString()
  }
}
