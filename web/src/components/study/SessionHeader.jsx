import { X } from 'lucide-react'
import SaveIndicator from './SaveIndicator'

export default function SessionHeader({
  currentIndex,
  totalItems,
  onEndSession,
  saveStatus,
  lastSaveTime
}) {
  const progress = totalItems > 0 ? ((currentIndex + 1) / totalItems) * 100 : 0

  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-bg-card-border bg-bg-card">
      <button
        onClick={onEndSession}
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <X className="w-5 h-5" />
        <span className="font-medium">End session</span>
      </button>

      <div className="flex items-center gap-4">
        <SaveIndicator status={saveStatus} lastSaveTime={lastSaveTime} />
        <span className="text-sm text-text-secondary">
          {currentIndex + 1} of {totalItems}
        </span>
        <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-progress rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
