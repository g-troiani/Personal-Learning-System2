import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SupabaseContext = createContext(null)

export function SupabaseProvider({ children }) {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch all content sources
  const fetchSources = async () => {
    try {
      const { data, error } = await supabase
        .from('content_sources')
        .select('*')
        .order('ingested_at', { ascending: false })

      if (error) throw error
      setSources(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching sources:', err?.message || err)
      setError(err?.message || 'Unknown error')
      return []
    }
  }

  // Get due items count grouped by category
  const getDueCounts = async () => {
    try {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // First get all sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('content_sources')
        .select('id, title')

      if (sourcesError) {
        console.error('Sources error:', sourcesError?.message || sourcesError)
        throw sourcesError
      }

      // Then get all KCs with their state
      const { data: kcsData, error: kcsError } = await supabase
        .from('knowledge_components')
        .select('id, source_id, name')

      if (kcsError) {
        console.error('KCs error:', kcsError?.message || kcsError)
        throw kcsError
      }

      // Get KC states
      const { data: statesData, error: statesError } = await supabase
        .from('kc_state')
        .select('kc_id, mastery_level, next_review_at, exposure_count')

      if (statesError) {
        console.error('States error:', statesError?.message || statesError)
        throw statesError
      }

      // Build a map of kc_id to state
      const stateMap = {}
      statesData?.forEach(state => {
        stateMap[state.kc_id] = state
      })

      // Build a map of source_id to source
      const sourceMap = {}
      sourcesData?.forEach(source => {
        sourceMap[source.id] = source
      })

      // Categorize items
      let overdue = 0
      let dueToday = 0
      let newContent = 0
      const bySource = {}

      kcsData?.forEach(kc => {
        const state = stateMap[kc.id]
        const source = sourceMap[kc.source_id]

        if (!source) return

        if (!bySource[kc.source_id]) {
          bySource[kc.source_id] = {
            id: kc.source_id,
            title: source.title,
            overdue: 0,
            dueToday: 0,
            newContent: 0
          }
        }

        if (!state || state.exposure_count === 0) {
          newContent++
          bySource[kc.source_id].newContent++
        } else if (state.next_review_at) {
          const reviewDate = new Date(state.next_review_at)
          if (reviewDate < todayStart) {
            overdue++
            bySource[kc.source_id].overdue++
          } else if (reviewDate <= todayEnd) {
            dueToday++
            bySource[kc.source_id].dueToday++
          }
        }
      })

      return {
        total: overdue + dueToday + newContent,
        overdue,
        dueToday,
        newContent,
        bySource: Object.values(bySource)
      }
    } catch (err) {
      console.error('Error getting due counts:', err?.message || err)
      return { total: 0, overdue: 0, dueToday: 0, newContent: 0, bySource: [] }
    }
  }

  // Get mastery by source
  const getMasteryBySource = async () => {
    try {
      // Get sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('content_sources')
        .select('id, title')

      if (sourcesError) throw sourcesError

      // Get KCs
      const { data: kcsData, error: kcsError } = await supabase
        .from('knowledge_components')
        .select('id, source_id')

      if (kcsError) throw kcsError

      // Get states
      const { data: statesData, error: statesError } = await supabase
        .from('kc_state')
        .select('kc_id, mastery_level')

      if (statesError) throw statesError

      // Build state map
      const stateMap = {}
      statesData?.forEach(state => {
        stateMap[state.kc_id] = state.mastery_level
      })

      // Group KCs by source
      const kcsBySource = {}
      kcsData?.forEach(kc => {
        if (!kcsBySource[kc.source_id]) {
          kcsBySource[kc.source_id] = []
        }
        kcsBySource[kc.source_id].push(kc.id)
      })

      // Calculate mastery per source
      return sourcesData?.map(source => {
        const kcIds = kcsBySource[source.id] || []
        const masteryLevels = kcIds
          .map(id => stateMap[id] || 0)

        const avgMastery = masteryLevels.length > 0
          ? masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length
          : 0

        return {
          id: source.id,
          title: source.title,
          mastery: Math.round(avgMastery * 100),
          kcCount: kcIds.length
        }
      }) || []
    } catch (err) {
      console.error('Error getting mastery by source:', err?.message || err)
      return []
    }
  }

  // Get recent sources for sidebar
  const getRecentSources = async (limit = 3) => {
    try {
      const { data, error } = await supabase
        .from('content_sources')
        .select('id, title')
        .order('ingested_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Recent sources error:', error?.message || error)
        throw error
      }
      return data || []
    } catch (err) {
      console.error('Error getting recent sources:', err?.message || err)
      return []
    }
  }

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await fetchSources()
      setLoading(false)
    }
    init()
  }, [])

  const value = {
    supabase,
    sources,
    loading,
    error,
    fetchSources,
    getDueCounts,
    getMasteryBySource,
    getRecentSources
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
