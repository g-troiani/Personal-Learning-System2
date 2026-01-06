import { BookOpen, Calendar, FileText, BarChart3 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    { label: 'Study', icon: BookOpen, path: '/study' },
    { label: 'Plan', icon: Calendar, path: '/calendar' },
    { label: 'Add Document', icon: FileText, path: '/sources?upload=true' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  ]

  return (
    <div className="flex gap-3 mb-8">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => navigate(action.path)}
          className="flex items-center gap-2 px-4 py-2 bg-btn-secondary rounded-button text-text-primary font-medium hover:bg-gray-200 transition-colors"
        >
          <action.icon className="w-4 h-4" />
          {action.label}
        </button>
      ))}
    </div>
  )
}
