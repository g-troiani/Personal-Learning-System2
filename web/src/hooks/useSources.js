import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'

/**
 * Custom hook for managing sources data with filtering, sorting, and caching
 */
export function useSources() {
  const { supabase, sources: contextSources, fetchSources } = useSupabase()

  // Local state for enriched source data
  const [enrichedSources, setEnrichedSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('')
  const [domainFilter, setDomainFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date') // 'date', 'name', 'mastery'
  const [sortOrder, setSortOrder] = useState('desc')

  // Fetch enriched source data (with KC counts, item counts, mastery, due counts)
  // isRefresh: if true, don't show loading spinner (background refresh)
  const fetchEnrichedSources = useCallback(async (isRefresh = false) => {
    try {
      // Only show loading on initial load, not on refresh
      if (!isRefresh) {
        setLoading(true)
      }
      setError(null)

      // Fetch sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('content_sources')
        .select('*')
        .order('ingested_at', { ascending: false })

      if (sourcesError) throw sourcesError

      // Fetch KCs for each source
      const { data: kcsData, error: kcsError } = await supabase
        .from('knowledge_components')
        .select('id, source_id, name')

      if (kcsError) throw kcsError

      // Fetch practice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('practice_items')
        .select('id, kc_id')

      if (itemsError) throw itemsError

      // Fetch KC states
      const { data: statesData, error: statesError } = await supabase
        .from('kc_state')
        .select('kc_id, mastery_level, next_review_at, exposure_count')

      if (statesError) throw statesError

      // Build maps
      const stateMap = {}
      statesData?.forEach(state => {
        stateMap[state.kc_id] = state
      })

      // Group KCs by source
      const kcsBySource = {}
      kcsData?.forEach(kc => {
        if (!kcsBySource[kc.source_id]) {
          kcsBySource[kc.source_id] = []
        }
        kcsBySource[kc.source_id].push(kc)
      })

      // Group items by KC, then aggregate by source
      const itemsByKc = {}
      itemsData?.forEach(item => {
        if (!itemsByKc[item.kc_id]) {
          itemsByKc[item.kc_id] = []
        }
        itemsByKc[item.kc_id].push(item)
      })

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // Enrich sources with computed data
      const enriched = sourcesData?.map(source => {
        const kcs = kcsBySource[source.id] || []
        const kcIds = kcs.map(kc => kc.id)

        // Count practice items for this source
        let itemCount = 0
        kcIds.forEach(kcId => {
          itemCount += (itemsByKc[kcId] || []).length
        })

        // Calculate mastery
        const masteryLevels = kcIds.map(id => stateMap[id]?.mastery_level || 0)
        const avgMastery = masteryLevels.length > 0
          ? masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length
          : 0

        // Calculate due counts
        let overdueCount = 0
        let dueCount = 0
        let newCount = 0

        kcIds.forEach(kcId => {
          const state = stateMap[kcId]
          if (!state || state.exposure_count === 0) {
            newCount++
          } else if (state.next_review_at) {
            const reviewDate = new Date(state.next_review_at)
            if (reviewDate < todayStart) {
              overdueCount++
            } else if (reviewDate <= todayEnd) {
              dueCount++
            }
          }
        })

        return {
          ...source,
          kcCount: kcs.length,
          itemCount,
          mastery: Math.round(avgMastery * 100),
          overdueCount,
          dueCount,
          newCount
        }
      }) || []

      setEnrichedSources(enriched)
      return enriched
    } catch (err) {
      console.error('Error fetching enriched sources:', err?.message || err)
      setError(err?.message || 'Failed to fetch sources')
      return []
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Get unique domains from sources
  const domains = useMemo(() => {
    const domainSet = new Set(enrichedSources.map(s => s.domain).filter(Boolean))
    return ['all', ...Array.from(domainSet).sort()]
  }, [enrichedSources])

  // Filtered and sorted sources
  const filteredSources = useMemo(() => {
    let result = [...enrichedSources]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(source =>
        source.title?.toLowerCase().includes(query) ||
        source.domain?.toLowerCase().includes(query)
      )
    }

    // Apply domain filter
    if (domainFilter !== 'all') {
      result = result.filter(source => source.domain === domainFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = (a.title || '').localeCompare(b.title || '')
          break
        case 'mastery':
          comparison = a.mastery - b.mastery
          break
        case 'date':
        default:
          comparison = new Date(a.ingested_at) - new Date(b.ingested_at)
          break
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return result
  }, [enrichedSources, searchQuery, domainFilter, sortBy, sortOrder])

  // Refresh data (background refresh without loading spinner)
  const refresh = useCallback(() => {
    return fetchEnrichedSources(true)
  }, [fetchEnrichedSources])

  // Initial fetch
  useEffect(() => {
    fetchEnrichedSources()
  }, [fetchEnrichedSources])

  return {
    sources: filteredSources,
    allSources: enrichedSources,
    loading,
    error,
    refresh,
    // Filter/sort state and setters
    searchQuery,
    setSearchQuery,
    domainFilter,
    setDomainFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    domains
  }
}
