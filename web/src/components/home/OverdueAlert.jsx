import { Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function OverdueAlert({ overdueCount }) {
  const navigate = useNavigate()

  if (!overdueCount || overdueCount === 0) {
    return null
  }

  return (
    <div className="bg-btn-action rounded-card p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-accent-alert" />
        <span className="text-text-primary font-medium">
          You have {overdueCount} {overdueCount === 1 ? 'item' : 'items'} overdue for review
        </span>
      </div>
      <button
        onClick={() => navigate('/due-for-review')}
        className="bg-accent-alert text-white px-4 py-2 rounded-button font-medium hover:bg-amber-600 transition-colors"
      >
        Review now
      </button>
    </div>
  )
}
