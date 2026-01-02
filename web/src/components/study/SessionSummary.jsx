import { CheckCircle, Clock, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SessionSummary({ itemsCompleted, averageScore, duration, onClose }) {
  const navigate = useNavigate()

  // Format duration in minutes and seconds
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  // Score to percentage
  const scorePercent = averageScore ? Math.round((averageScore / 5) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-card rounded-card p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-text-primary">Session Complete!</h2>
          <p className="text-text-secondary mt-1">Great work on your practice session</p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-button">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-accent-progress" />
              <span className="text-text-secondary">Items Completed</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">{itemsCompleted}</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-button">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-accent-progress" />
              <span className="text-text-secondary">Average Score</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">{scorePercent}%</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-button">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-accent-progress" />
              <span className="text-text-secondary">Duration</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">{formatDuration(duration)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3 bg-btn-secondary text-text-primary rounded-button font-medium hover:bg-gray-200 transition-colors"
          >
            Go Home
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors"
          >
            Study More
          </button>
        </div>
      </div>
    </div>
  )
}
