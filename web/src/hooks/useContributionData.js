import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  generateDateGrid,
  aggregateAttempts,
  resolveCellColor,
  getSourceHue,
  computeSummary,
} from '../lib/contributionGraph'

const CACHE_TTL_MS = 5 * 60 * 1000 // 5-minute cache

/**
 * Fetches practice attempt data from Supabase and transforms it into
 * a contribution grid. Standalone hook (not in SupabaseContext).
 *
 * @param {Object} options
 * @param {number} options.weeks - Number of weeks to display (12, 26, or 52)
 * @param {string|null} options.sourceFilter - Filter to a single source ID, or null for all
 * @returns {{ gridData, sources, loading, error, totalAttempts, activeDays, refresh }}
 */
export function useContributionData({ weeks = 26, sourceFilter = null } = {}) {
  const [gridData, setGridData] = useState([])
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [activeDays, setActiveDays] = useState(0)

  // Cache: stores { data, timestamp } keyed by weeks+sourceFilter
  const cacheRef = useRef({})

  const cacheKey = useMemo(() => `${weeks}_${sourceFilter || 'all'}`, [weeks, sourceFilter])

  const fetchData = useCallback(async (isRefresh = false) => {
    // Check cache (unless forced refresh)
    if (!isRefresh) {
      const cached = cacheRef.current[cacheKey]
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setGridData(cached.gridData)
        setSources(cached.sources)
        setTotalAttempts(cached.totalAttempts)
        setActiveDays(cached.activeDays)
        setLoading(false)
        setError(null)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      // Compute date range
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - weeks * 7)
      startDate.setHours(0, 0, 0, 0)

      // Two parallel queries
      const [attemptsResult, kcsResult] = await Promise.all([
        supabase
          .from('attempts')
          .select('kc_id, started_at')
          .gte('started_at', startDate.toISOString())
          .order('started_at', { ascending: true }),
        supabase
          .from('knowledge_components')
          .select('id, source_id, source:content_sources(id, title, domain)'),
      ])

      if (attemptsResult.error) throw attemptsResult.error

      // Build KC-to-source map
      const kcSourceMap = {}
      if (kcsResult.data) {
        for (const kc of kcsResult.data) {
          kcSourceMap[kc.id] = {
            sourceId: kc.source_id,
            sourceTitle: kc.source?.title || 'Deleted source',
          }
        }
      }

      // Filter by source if requested
      let attempts = attemptsResult.data || []
      if (sourceFilter) {
        attempts = attempts.filter(a => {
          const kcInfo = kcSourceMap[a.kc_id]
          return kcInfo?.sourceId === sourceFilter
        })
      }

      // Aggregate attempts by date
      const dateMap = aggregateAttempts(attempts, kcSourceMap)

      // Build source hue map and unique sources list
      const sourceHueMap = {}
      const uniqueSources = new Map()
      if (kcsResult.data) {
        for (const kc of kcsResult.data) {
          if (kc.source_id && !uniqueSources.has(kc.source_id)) {
            const hue = getSourceHue(kc.source_id)
            sourceHueMap[kc.source_id] = hue
            uniqueSources.set(kc.source_id, {
              id: kc.source_id,
              title: kc.source?.title || 'Deleted source',
              domain: kc.source?.domain || null,
              hue,
            })
          }
        }
      }

      // Generate date grid and merge with attempt data
      const grid = generateDateGrid(weeks)
      const enrichedGrid = grid.map(week =>
        week.map(cell => {
          const dayData = dateMap.get(cell.date) || null
          const cellColor = resolveCellColor(dayData, sourceHueMap)
          return {
            ...cell,
            count: dayData?.total || 0,
            bySource: dayData?.bySource || {},
            ...cellColor,
          }
        })
      )

      // Compute summary
      const summary = computeSummary(dateMap)

      // Update state
      const sourcesArray = Array.from(uniqueSources.values())
      setGridData(enrichedGrid)
      setSources(sourcesArray)
      setTotalAttempts(summary.totalAttempts)
      setActiveDays(summary.activeDays)

      // Cache the result
      cacheRef.current[cacheKey] = {
        gridData: enrichedGrid,
        sources: sourcesArray,
        totalAttempts: summary.totalAttempts,
        activeDays: summary.activeDays,
        timestamp: Date.now(),
      }
    } catch (err) {
      console.error('Error fetching contribution data:', err?.message || err)
      setError(err?.message || 'Failed to load activity data')
      setGridData([])
      setSources([])
      setTotalAttempts(0)
      setActiveDays(0)
    } finally {
      setLoading(false)
    }
  }, [weeks, sourceFilter, cacheKey])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => fetchData(true), [fetchData])

  return {
    gridData,
    sources,
    loading,
    error,
    totalAttempts,
    activeDays,
    refresh,
  }
}
