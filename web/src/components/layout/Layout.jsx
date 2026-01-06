import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useZenMode } from '../../contexts/ZenModeContext'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function Layout() {
  const location = useLocation()
  const { isZenMode } = useZenMode()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved === 'true'
  })

  // Detect if we're on a reader route
  const isReaderRoute = /^\/reader\//.test(location.pathname)

  // Hide sidebar completely in zen mode on reader routes
  const hideSidebar = isZenMode && isReaderRoute

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed)
  }, [sidebarCollapsed])

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  return (
    <div className="flex min-h-screen bg-bg-main">
      {!hideSidebar && (
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      )}
      <main
        className={`flex-1 transition-all duration-300 ${
          hideSidebar
            ? 'ml-0'
            : sidebarCollapsed
              ? 'ml-sidebar-collapsed'
              : 'ml-sidebar'
        }`}
      >
        {/* Full-width for reader in zen mode, constrained otherwise */}
        <div className={isReaderRoute ? 'h-full' : 'p-8 max-w-5xl mx-auto'}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
