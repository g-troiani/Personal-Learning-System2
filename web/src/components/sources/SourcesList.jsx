import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, FileText, Clock, AlertCircle, RefreshCw, MoreVertical, Trash2, Eye } from 'lucide-react'
import { ProcessingBadge } from './ProcessingStatus'
import ProcessingStatus from './ProcessingStatus'

// Dropdown menu component for source actions
function SourceMenu({ onDelete, onViewDetails, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleToggle = (e) => {
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleAction = (e, action) => {
    e.stopPropagation()
    setIsOpen(false)
    action()
  }

  if (disabled) return null

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={handleToggle}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Source options"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-150">
          <button
            onClick={(e) => handleAction(e, onViewDetails)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Eye className="w-4 h-4" />
            View Details
          </button>
          <button
            onClick={(e) => handleAction(e, onDelete)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// Source emoji mapping based on domain
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

// Domain badge colors
const domainColors = {
  'ai_ml': 'bg-purple-100 text-purple-700',
  'programming': 'bg-blue-100 text-blue-700',
  'math': 'bg-orange-100 text-orange-700',
  'science': 'bg-green-100 text-green-700',
  'history': 'bg-amber-100 text-amber-700',
  'language': 'bg-pink-100 text-pink-700',
  'business': 'bg-indigo-100 text-indigo-700',
  'health': 'bg-red-100 text-red-700',
  'general': 'bg-gray-100 text-gray-700',
}

const domainLabels = {
  'ai_ml': 'AI/ML',
  'programming': 'Programming',
  'math': 'Math',
  'science': 'Science',
  'history': 'History',
  'language': 'Language',
  'business': 'Business',
  'health': 'Health',
  'general': 'General'
}

function SourceCard({ source, onRetry, onDelete, onViewDetails }) {
  const navigate = useNavigate()
  const emoji = getSourceEmoji(source)

  // Check if source is currently processing
  const isProcessing = source.processing_status && !['ready', 'error'].includes(source.processing_status)
  const hasError = source.processing_status === 'error'
  const isPending = source.processing_status === 'pending'

  // Check if processing/pending has failed (> 30 minutes)
  const hasFailed = (() => {
    if (!isProcessing && !isPending) return false

    // For processing sources, check processing_started_at
    // For pending sources, check ingested_at (when upload was created)
    const timestamp = isPending ? source.ingested_at : source.processing_started_at
    if (!timestamp) return false

    const startedAt = new Date(timestamp)
    const now = new Date()
    const minutesElapsed = (now - startedAt) / (1000 * 60)
    return minutesElapsed > 30
  })()

  // Truncate title if too long
  const truncatedTitle = source.title?.length > 35
    ? source.title.substring(0, 35) + '...'
    : source.title

  const handleClick = () => {
    // Don't navigate if still processing
    if (isProcessing || isPending) return
    navigate(`/study?source=${source.id}`)
  }

  const handleRetry = (e) => {
    e.stopPropagation()
    if (onRetry) onRetry(source.id)
  }

  const handleDelete = () => {
    if (onDelete) onDelete(source)
  }

  const handleViewDetails = () => {
    if (onViewDetails) onViewDetails(source)
  }

  const totalDue = (source.overdueCount || 0) + (source.dueCount || 0) + (source.newCount || 0)

  // Card style based on state
  const cardClasses = `bg-bg-card border rounded-card p-5 transition-all ${
    isProcessing || isPending
      ? 'border-cyan-500/30 cursor-default'
      : hasError
        ? 'border-red-500/30 cursor-pointer hover:shadow-md'
        : 'border-bg-card-border cursor-pointer hover:shadow-md hover:border-accent-new/30'
  }`

  // Disable menu during processing/pending states (unless failed due to timeout)
  const menuDisabled = (isProcessing || isPending) && !hasFailed

  return (
    <div onClick={handleClick} className={cardClasses}>
      {/* Header: Emoji, Title, and Menu */}
      <div className="flex items-start gap-3 mb-4">
        <span className={`text-3xl ${isProcessing ? 'animate-pulse' : ''}`}>{emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-text-primary truncate flex-1" title={source.title}>
              {truncatedTitle}
            </h3>
            {/* Processing badge */}
            <ProcessingBadge
              status={source.processing_status}
              progress={source.processing_progress || 0}
            />
            {/* Source actions menu */}
            <SourceMenu
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              disabled={menuDisabled}
            />
          </div>
          {/* Domain badge */}
          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${domainColors[source.domain] || domainColors.general}`}>
            {domainLabels[source.domain] || source.domain}
          </span>
        </div>
      </div>

      {/* Show processing status if actively processing */}
      {(isProcessing || isPending) && (
        <div className="mb-4">
          <ProcessingStatus
            status={source.processing_status}
            progress={source.processing_progress || 0}
            step={source.processing_step}
            variant="compact"
          />
          {hasFailed && (
            <div className="mt-2 flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Failed upload - use menu to delete</span>
            </div>
          )}
        </div>
      )}

      {/* Show error state with retry button */}
      {hasError && (
        <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Processing failed</span>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded hover:bg-cyan-500/20 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
          {source.error_message && (
            <p className="text-xs text-red-300/70 mt-1 line-clamp-2">{source.error_message}</p>
          )}
        </div>
      )}

      {/* Only show stats and progress if processing is complete */}
      {!isProcessing && !isPending && !hasError && (
        <>
          {/* Stats row */}
          <div className="flex gap-4 mb-4 text-sm text-text-secondary">
            <div className="flex items-center gap-1" title="Knowledge Components">
              <Brain className="w-4 h-4" />
              <span>{source.kcCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Practice Items">
              <FileText className="w-4 h-4" />
              <span>{source.itemCount || 0}</span>
            </div>
          </div>

          {/* Mastery progress */}
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-text-muted">Mastery</span>
              <span className="text-sm font-medium text-text-primary">{source.mastery || 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-progress rounded-full transition-all duration-300"
                style={{ width: `${source.mastery || 0}%` }}
              />
            </div>
          </div>

          {/* Due status */}
          <div className="flex flex-wrap gap-2 text-sm">
            {source.overdueCount > 0 && (
              <span className="flex items-center gap-1 text-accent-overdue font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {source.overdueCount} overdue
              </span>
            )}
            {source.dueCount > 0 && (
              <span className="flex items-center gap-1 text-accent-alert font-medium">
                <Clock className="w-3.5 h-3.5" />
                {source.dueCount} due
              </span>
            )}
            {source.newCount > 0 && (
              <span className="text-accent-new font-medium">
                {source.newCount} new
              </span>
            )}
            {totalDue === 0 && (
              <span className="text-accent-progress font-medium">
                All caught up
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function SourcesList({ sources, onRetry, onDelete, onViewDetails }) {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sources.map(source => (
        <SourceCard
          key={source.id}
          source={source}
          onRetry={onRetry}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
        />
      ))}
    </div>
  )
}
