import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export default function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved === 'true'
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed)
  }, [sidebarCollapsed])

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev)
  }

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'ml-sidebar-collapsed' : 'ml-sidebar'
        }`}
      >
        <div className="p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
