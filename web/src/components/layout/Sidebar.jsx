import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Home,
  Calendar,
  ClipboardList,
  BookOpen,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield
} from 'lucide-react'
import { useSupabase } from '../../contexts/SupabaseContext'
import { useAuth } from '../../contexts/AuthContext'
import { useDocumentSections } from '../../hooks/useDocumentSections'
import { useIsAdmin } from '../auth/AdminRoute'
import TableOfContentsSection from '../reader/TableOfContentsSection'

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
  const { user, signOut } = useAuth()
  const isAdmin = useIsAdmin()
  const [recentSources, setRecentSources] = useState([])
  const [dueCount, setDueCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Get user display info
  const userEmail = user?.email || 'User'
  const userInitial = userEmail.charAt(0).toUpperCase()

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await signOut()
    // Redirect happens automatically via AuthContext
  }

  // Detect if we're on the document reader route
  const location = useLocation()
  const readerMatch = location.pathname.match(/^\/reader\/([^/]+)$/)
  const isReaderRoute = Boolean(readerMatch)
  const currentSourceId = readerMatch ? readerMatch[1] : null

  // Fetch document sections for TOC (only when on reader route)
  const { sections: tocSections, loading: tocLoading } = useDocumentSections(
    isReaderRoute ? currentSourceId : null
  )

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
    // Admin link (only shown for admin users)
    ...(isAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
  ]

  return (
    <aside
      className={`h-screen bg-amber-50 flex flex-col border-r border-bg-card-border fixed left-0 top-0 transition-all duration-300 ${
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
                  `flex items-center gap-3 py-2.5 rounded-lg text-base transition-colors ${
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
                      <span className="bg-accent-alert text-white text-sm font-medium px-2 py-0.5 rounded-full">
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
            <h3 className="px-3 text-sm font-medium text-text-muted uppercase tracking-wider mb-2">
              Recent
            </h3>
            <ul className="space-y-1">
              {recentSources.map(source => (
                <li key={source.id}>
                  <NavLink
                    to={`/reader/${source.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-base text-text-secondary hover:bg-btn-secondary/50 rounded-lg transition-colors"
                  >
                    <span>{getSourceEmoji(source.title)}</span>
                    <span className="truncate">{source.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* TOC Section - only show when expanded and on reader route */}
        {!collapsed && isReaderRoute && (
          <TableOfContentsSection sections={tocSections} loading={tocLoading} />
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-bg-card-border">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-9 h-9 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-medium">
            {userInitial}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-text-primary truncate">
                  {userEmail}
                </div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className="p-1.5 rounded-lg hover:bg-btn-secondary text-text-secondary hover:text-accent-alert transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="mt-2 w-full p-1.5 rounded-lg hover:bg-btn-secondary text-text-secondary hover:text-accent-alert transition-colors flex justify-center"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  )
}
