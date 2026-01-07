/**
 * API client for authenticated requests to the FastAPI backend.
 * Automatically includes auth headers from the current session.
 */

import { supabase } from './supabase'

const API_BASE = 'http://localhost:8000/api'

/**
 * Get the current access token for API requests.
 */
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * Make an authenticated fetch request.
 * Automatically adds Authorization header if user is logged in.
 * Handles 401 responses by redirecting to login.
 */
async function authFetch(url, options = {}) {
  const token = await getAccessToken()

  const headers = {
    ...options.headers,
  }

  // Add auth header if we have a token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Check for token expiring soon header
  if (response.headers.get('X-Token-Expiring-Soon')) {
    console.log('Token expiring soon - consider refreshing')
    // The auth context will handle refresh automatically
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    // Session might be expired, try refreshing
    const { error } = await supabase.auth.refreshSession()
    if (error) {
      // Refresh failed, redirect to login
      window.location.href = '/login'
      throw new Error('Session expired')
    }
    // Retry the request with new token
    const newToken = await getAccessToken()
    headers['Authorization'] = `Bearer ${newToken}`
    return fetch(url, { ...options, headers })
  }

  return response
}

/**
 * Upload a file to the backend.
 */
export async function uploadSource(file, domain = 'general') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('domain', domain)

  const response = await authFetch(`${API_BASE}/sources/upload`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Upload failed')
  }

  return response.json()
}

/**
 * Get processing status for a source.
 */
export async function getSourceStatus(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}/status`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get status')
  }

  return response.json()
}

/**
 * Retry processing for a failed source.
 */
export async function retrySource(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}/retry`, {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Retry failed')
  }

  return response.json()
}

/**
 * Delete a source.
 */
export async function deleteSource(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Delete failed')
  }

  return response.json()
}

/**
 * Get signed URL for a source file.
 */
export async function getFileUrl(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}/file-url`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get file URL')
  }

  return response.json()
}

/**
 * Get converted PDF URL for PPTX sources.
 */
export async function getPdfUrl(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}/pdf-url`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get PDF URL')
  }

  return response.json()
}

/**
 * Get document sections (table of contents).
 */
export async function getSections(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}/sections`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get sections')
  }

  return response.json()
}

/**
 * Get document content.
 */
export async function getContent(sourceId) {
  const response = await authFetch(`${API_BASE}/sources/${sourceId}/content`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get content')
  }

  return response.json()
}

/**
 * Chat with AI about a document.
 */
export async function chatWithDocument(sourceId, message, context = null) {
  const response = await authFetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source_id: sourceId,
      message,
      context,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Chat failed')
  }

  return response.json()
}

export default {
  uploadSource,
  getSourceStatus,
  retrySource,
  deleteSource,
  getFileUrl,
  getPdfUrl,
  getSections,
  getContent,
  chatWithDocument,
}
