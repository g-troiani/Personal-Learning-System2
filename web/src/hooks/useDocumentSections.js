import { useState, useEffect, useCallback } from 'react'

// API base URL from environment or default to localhost:8001
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

/**
 * Hook to fetch document sections (TOC) for a given source.
 * Sections are static (generated at ingestion), so no real-time updates needed.
 *
 * @param {string} sourceId - The source ID to fetch sections for
 * @returns {Object} { sections, loading, error, refetch }
 */
export function useDocumentSections(sourceId) {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchSections = useCallback(async () => {
    if (!sourceId) {
      setSections([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/sources/${sourceId}/sections`)

      if (!response.ok) {
        if (response.status === 404) {
          // No sections found is not an error, just empty
          setSections([])
          return
        }
        throw new Error(`Failed to fetch sections: ${response.status}`)
      }

      const data = await response.json()
      setSections(data.sections || [])
    } catch (err) {
      console.error('Error fetching document sections:', err)
      setError(err.message)
      setSections([])
    } finally {
      setLoading(false)
    }
  }, [sourceId])

  // Fetch sections when sourceId changes
  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  return {
    sections,
    loading,
    error,
    refetch: fetchSections
  }
}

export default useDocumentSections
