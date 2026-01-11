import { useState, useEffect } from 'react'
import { Shield, UserPlus, Trash2, AlertCircle, Check, X } from 'lucide-react'
import { listApprovedUsers, addApprovedUser, removeApprovedUser } from '../lib/api'

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form state
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [addingUser, setAddingUser] = useState(false)
  const [addError, setAddError] = useState(null)
  const [addSuccess, setAddSuccess] = useState(null)

  // Confirmation dialog state
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    setError(null)
    try {
      const result = await listApprovedUsers()
      setUsers(result.users || [])
    } catch (err) {
      setError(err.message || 'Failed to load approved users')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddUser(e) {
    e.preventDefault()
    if (!email.trim()) return

    setAddingUser(true)
    setAddError(null)
    setAddSuccess(null)

    try {
      await addApprovedUser(email.trim(), notes.trim() || null)
      setAddSuccess(`${email} has been approved for uploads`)
      setEmail('')
      setNotes('')
      await fetchUsers()
    } catch (err) {
      setAddError(err.message || 'Failed to add user')
    } finally {
      setAddingUser(false)
    }
  }

  async function handleRemoveUser(userEmail) {
    setDeleting(true)
    try {
      await removeApprovedUser(userEmail)
      setConfirmDelete(null)
      await fetchUsers()
    } catch (err) {
      setError(err.message || 'Failed to remove user')
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F7]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-600">
          Manage approved users who can upload documents. Document upload triggers expensive API calls (Claude, Groq).
        </p>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Add user form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-teal-600" />
          Add Approved User
        </h2>

        <form onSubmit={handleAddUser} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Beta tester"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={addingUser || !email.trim()}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addingUser ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Add User
                </>
              )}
            </button>

            {addSuccess && (
              <p className="text-green-600 text-sm flex items-center gap-1">
                <Check className="w-4 h-4" />
                {addSuccess}
              </p>
            )}

            {addError && (
              <p className="text-red-600 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {addError}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Approved users table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approved Users ({users.length})
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No approved users yet. Add some above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Approved At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.email} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900 font-medium">{user.email}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {user.approved_by}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                      {formatDate(user.approved_at)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {user.notes || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {user.approved_by === 'system' ? (
                        <span className="text-xs text-gray-400 italic">Admin user</span>
                      ) : confirmDelete === user.email ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-gray-600">Remove?</span>
                          <button
                            onClick={() => handleRemoveUser(user.email)}
                            disabled={deleting}
                            className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            disabled={deleting}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(user.email)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Only approved users can upload documents. Non-approved users can still log in and view existing data but will receive a 403 error when attempting to upload. Admin users (marked as "system" approved by) cannot be removed.
        </p>
      </div>
    </div>
  )
}
