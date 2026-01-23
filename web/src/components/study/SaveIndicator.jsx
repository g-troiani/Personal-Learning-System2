import { Cloud, CloudOff, Check, RefreshCw } from 'lucide-react'

/**
 * SaveIndicator - Shows the current save status in the session header
 *
 * Status states:
 * - 'idle': No save in progress
 * - 'saving': Currently saving to database
 * - 'saved': Successfully saved
 * - 'error': Failed to save
 */
export default function SaveIndicator({ status, lastSaveTime }) {
  // Format last save time
  const formatLastSave = () => {
    if (!lastSaveTime) return null
    const diff = Date.now() - lastSaveTime
    if (diff < 5000) return 'Just saved'
    if (diff < 60000) return 'Saved'
    return null
  }

  const lastSaveLabel = formatLastSave()

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-text-secondary">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-xs">Saving...</span>
      </div>
    )
  }

  if (status === 'saved' && lastSaveLabel) {
    return (
      <div className="flex items-center gap-1.5 text-accent-progress">
        <Cloud className="w-4 h-4" />
        <span className="text-xs">{lastSaveLabel}</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-red-500">
        <CloudOff className="w-4 h-4" />
        <span className="text-xs">Save failed</span>
      </div>
    )
  }

  // Default: show saved icon if we have a last save time
  if (lastSaveTime) {
    return (
      <div className="flex items-center gap-1.5 text-text-secondary">
        <Check className="w-4 h-4" />
      </div>
    )
  }

  return null
}
