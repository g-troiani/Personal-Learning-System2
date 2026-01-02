import { useState } from 'react'
import { Plus } from 'lucide-react'

export default function ScheduleForm({ sources, selectedDate, onSchedule }) {
  const [sourceId, setSourceId] = useState('')
  const [sessionType, setSessionType] = useState('review')
  const [duration, setDuration] = useState(30)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Select a date'
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedDate) {
      alert('Please select a date on the calendar')
      return
    }

    setIsSubmitting(true)
    try {
      await onSchedule({
        source_id: sourceId || null,
        session_type: sessionType,
        duration_minutes: duration,
        scheduled_for: selectedDate.toISOString()
      })
      // Reset form
      setSourceId('')
      setSessionType('review')
      setDuration(30)
    } catch (err) {
      console.error('Failed to schedule session:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-bg-card rounded-card border border-bg-card-border p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        Schedule a Study Session
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Source dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Source
            </label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full px-3 py-2 bg-bg-main border border-bg-card-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-progress"
            >
              <option value="">All sources</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </div>

          {/* Session type dropdown */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full px-3 py-2 bg-bg-main border border-bg-card-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-progress"
            >
              <option value="review">Review</option>
              <option value="study">Study</option>
              <option value="new">New Content</option>
            </select>
          </div>

          {/* Duration input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              min={5}
              max={120}
              className="w-full px-3 py-2 bg-bg-main border border-bg-card-border rounded-button text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-progress"
            />
          </div>

          {/* Selected date display */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Date
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-bg-card-border rounded-button text-text-primary">
              {formatDate(selectedDate)}
            </div>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedDate}
          className="w-full flex items-center justify-center gap-2 py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          {isSubmitting ? 'Scheduling...' : 'Add to Calendar'}
        </button>
      </form>
    </div>
  )
}
