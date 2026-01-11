import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Hardcoded admin emails for client-side checks.
 * This matches the backend ADMIN_EMAILS list in approval.py.
 * Note: This is for UI display purposes only - backend enforces actual access.
 */
const ADMIN_EMAILS = [
  'gianmariatroiani@gmail.com',
  'gtroiani@equilibriaconsulting.net',
]

/**
 * Hook to check if the current user is an admin.
 * Uses local email check for fast UI rendering.
 */
export function useIsAdmin() {
  const { user } = useAuth()

  if (!user || !user.email) {
    return false
  }

  return ADMIN_EMAILS.includes(user.email.toLowerCase())
}

/**
 * Route guard that only allows admin users.
 * Non-admins are redirected to home page.
 */
export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const isAdmin = useIsAdmin()

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Redirect to home if not admin
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
