import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Home,
  Calendar,
  ClipboardList,
  BookOpen,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useSupabase } from '../../contexts/SupabaseContext'

// Emoji mapping for sources (can be customized per source)
const sourceEmojis = {
  'default': '📚',
  'llm': '🧠',
  'terraform': '🏗️',
  'docker': '🐳',
  'python': '🐍',
  'ai': '🤖',
  'ml': '📊'
}

function getSourceEmoji(title) {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('llm') || lowerTitle.includes('evaluating')) return sourceEmojis.llm
  if (lowerTitle.includes('terraform')) return sourceEmojis.terraform
  if (lowerTitle.includes('docker')) return sourceEmojis.docker
  if (lowerTitle.includes('python')) return sourceEmojis.python
  if (lowerTitle.includes('ai') || lowerTitle.includes('agent')) return sourceEmojis.ai
  if (lowerTitle.includes('ml') || lowerTitle.includes('machine')) return sourceEmojis.ml
  return sourceEmojis.default
}

export default function Sidebar({ collapsed, onToggle }) {
  const { getRecentSources, getDueCounts, sources } = useSupabase()
  const [recentSources, setRecentSources] = useState([])
  const [dueCount, setDueCount] = useState(0)

  // Refresh sidebar data when sources change (including after deletes)
  useEffect(() => {
    const loadData = async () => {
      const recent = await getRecentSources(3)
      setRecentSources(recent)

      const counts = await getDueCounts()
      setDueCount(counts.total)
    }
    loadData()
  }, [sources])

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/review', icon: ClipboardList, label: 'Due for Review', badge: dueCount },
    { to: '/sources', icon: BookOpen, label: 'Sources' },
    { to: '/progress', icon: BarChart2, label: 'Progress' },
    { to: '/analytics', icon: Settings, label: 'Analytics' },
  ]

  return (
    <aside
      className={`h-screen bg-bg-sidebar flex flex-col border-r border-bg-card-border fixed left-0 top-0 transition-all duration-300 ${
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      }`}
    >
      {/* Logo and Collapse Button */}
      <div className={`flex items-center justify-between py-5 ${collapsed ? 'px-2' : 'px-4'}`}>
        {!collapsed && <h1 className="text-xl font-semibold text-text-primary">Learn</h1>}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg hover:bg-btn-secondary text-text-secondary transition-colors ${
            collapsed ? 'mx-auto' : ''
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        <ul className="space-y-1">
          {navItems.map(item => (
            <li key={item.to} className="relative">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 rounded-lg text-sm transition-colors ${
                    collapsed ? 'justify-center px-2' : 'px-3'
                  } ${
                    isActive
                      ? 'bg-btn-secondary text-text-primary font-medium'
                      : 'text-text-secondary hover:bg-btn-secondary/50'
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <span className="relative">
                  <item.icon size={20} />
                  {collapsed && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-alert rounded-full" />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge > 0 && (
                      <span className="bg-accent-alert text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Recent Section - only show when expanded */}
        {!collapsed && recentSources.length > 0 && (
          <div className="mt-8">
            <h3 className="px-3 text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
              Recent
            </h3>
            <ul className="space-y-1">
              {recentSources.map(source => (
                <li key={source.id}>
                  <NavLink
                    to={`/sources/${source.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-btn-secondary/50 rounded-lg transition-colors"
                  >
                    <span>{getSourceEmoji(source.title)}</span>
                    <span className="truncate">{source.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-bg-card-border">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-full bg-text-muted/20 flex items-center justify-center text-text-secondary font-medium">
            G
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-medium text-text-primary">Gian</div>
              <div className="text-xs text-text-muted">Pro plan</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
