import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const { signUp } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Validate password strength
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    const { data, error } = await signUp(email, password)

    setIsLoading(false)

    if (error) {
      setErrorMessage(error)
    } else if (data?.user?.identities?.length === 0) {
      // User already exists
      setErrorMessage('An account with this email already exists')
    } else {
      setSuccessMessage(
        'Account created! Please check your email to confirm your account.'
      )
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F7] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Create account</h1>
          <p className="text-gray-600 mt-2">Start your learning journey</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMessage && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg text-sm">
                {successMessage}
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
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
