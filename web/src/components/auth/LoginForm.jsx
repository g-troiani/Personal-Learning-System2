import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get redirect destination from location state, or default to home
  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')

    const { error } = await signIn(email, password)

    if (error) {
      setErrorMessage(error)
      setIsLoading(false)
    } else {
      // Redirect to intended destination or home
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F7] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">Sign in to continue learning</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
