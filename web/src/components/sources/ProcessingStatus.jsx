import { useMemo } from 'react'

/**
 * ProcessingStatus component - displays current processing step and progress
 * Shows animated progress bar and step indicator
 */

const PROCESSING_STEPS = [
  { key: 'extracting_text', label: 'Extracting', icon: '📄' },
  { key: 'extracting_kcs', label: 'Analyzing', icon: '🧠' },
  { key: 'generating_items', label: 'Generating', icon: '✨' },
  { key: 'ready', label: 'Complete', icon: '✓' }
]

export default function ProcessingStatus({
  status,
  progress = 0,
  step = '',
  error = null,
  variant = 'default' // 'default' | 'compact' | 'card'
}) {
  // Determine current step index
  const currentStepIndex = useMemo(() => {
    if (!status) return -1
    return PROCESSING_STEPS.findIndex(s => s.key === status)
  }, [status])

  // Error state
  if (status === 'error') {
    return (
      <div className={`processing-status processing-status--error ${variant === 'compact' ? 'processing-status--compact' : ''}`}>
        <div className="flex items-center gap-2 text-red-400">
          <span className="text-lg">⚠️</span>
          <span className="font-medium">Processing Failed</span>
        </div>
        {error && variant !== 'compact' && (
          <p className="text-sm text-red-300/70 mt-1 line-clamp-2">{error}</p>
        )}
      </div>
    )
  }

  // Pending state
  if (status === 'pending') {
    return (
      <div className={`processing-status processing-status--pending ${variant === 'compact' ? 'processing-status--compact' : ''}`}>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="animate-pulse">⏳</span>
          <span>Waiting to process...</span>
        </div>
      </div>
    )
  }

  // Ready/Complete state
  if (status === 'ready') {
    return (
      <div className={`processing-status processing-status--ready ${variant === 'compact' ? 'processing-status--compact' : ''}`}>
        <div className="flex items-center gap-2 text-emerald-400">
          <span>✓</span>
          <span className="font-medium">Ready</span>
        </div>
      </div>
    )
  }

  // Active processing state
  return (
    <div className={`processing-status ${variant === 'compact' ? 'processing-status--compact' : ''}`}>
      {/* Progress bar */}
      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out relative"
          style={{ width: `${Math.max(progress, 5)}%` }}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Step indicators */}
      {variant !== 'compact' && (
        <div className="flex justify-between mt-3">
          {PROCESSING_STEPS.slice(0, -1).map((stepItem, index) => {
            const isActive = index === currentStepIndex
            const isComplete = index < currentStepIndex

            return (
              <div
                key={stepItem.key}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                  isActive ? 'text-cyan-400' : isComplete ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                <span className={`text-lg ${isActive ? 'animate-bounce' : ''}`}>
                  {isComplete ? '✓' : stepItem.icon}
                </span>
                <span className="text-xs font-medium">{stepItem.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Current step message */}
      <div className={`flex items-center gap-2 ${variant === 'compact' ? 'mt-1' : 'mt-3'}`}>
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        <span className="text-sm text-slate-300 truncate">{step || 'Processing...'}</span>
        <span className="text-sm text-slate-500 ml-auto">{progress}%</span>
      </div>
    </div>
  )
}

/**
 * Compact inline status for cards
 */
export function ProcessingBadge({ status, progress = 0 }) {
  if (status === 'ready' || !status) {
    return null
  }

  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
        <span>⚠️</span> Failed
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-400 border border-slate-500/30">
        <span className="animate-pulse">⏳</span> Pending
      </span>
    )
  }

  // Active processing
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
      <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
      {progress}%
    </span>
  )
}
