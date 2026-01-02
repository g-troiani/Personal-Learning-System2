import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { Filter, Calendar, BookOpen, Layers } from 'lucide-react'
import InsightCards from '../components/analytics/InsightCards'
import TechniqueComparison from '../components/analytics/TechniqueComparison'
import PerformanceByType from '../components/analytics/PerformanceByType'
import CalibrationAnalysis from '../components/analytics/CalibrationAnalysis'
import ItemsNeedingAttention from '../components/analytics/ItemsNeedingAttention'

// Time period options
const TIME_PERIODS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' }
]

// Knowledge type options
const KNOWLEDGE_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'factual', label: 'Factual' },
  { value: 'conceptual', label: 'Conceptual' },
  { value: 'procedural', label: 'Procedural' },
  { value: 'metacognitive', label: 'Metacognitive' }
]

export default function Analytics() {
  const { supabase, sources } = useSupabase()

  // Filter state
  const [timePeriod, setTimePeriod] = useState('30')
  const [selectedSource, setSelectedSource] = useState('all')
  const [selectedType, setSelectedType] = useState('all')

  // Data state
  const [loading, setLoading] = useState(true)
  const [performanceByType, setPerformanceByType] = useState([])
  const [calibrationData, setCalibrationData] = useState([])
  const [techniqueData, setTechniqueData] = useState([])
  const [strugglingItems, setStrugglingItems] = useState([])

  // Calculate date filter
  const getDateFilter = useCallback(() => {
    if (timePeriod === 'all') return null
    const days = parseInt(timePeriod)
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
  }, [timePeriod])

  // Fetch performance by knowledge type
  const fetchPerformanceByType = useCallback(async () => {
    try {
      const dateFilter = getDateFilter()

      // Get all KCs with their types
      let kcsQuery = supabase
        .from('knowledge_components')
        .select('id, knowledge_type, source_id')

      if (selectedSource !== 'all') {
        kcsQuery = kcsQuery.eq('source_id', selectedSource)
      }

      const { data: kcs, error: kcsError } = await kcsQuery
      if (kcsError) throw kcsError

      // Get all attempts
      let attemptsQuery = supabase
        .from('attempts')
        .select('kc_id, score, completed_at')
        .not('score', 'is', null)

      if (dateFilter) {
        attemptsQuery = attemptsQuery.gte('completed_at', dateFilter)
      }

      const { data: attempts, error: attemptsError } = await attemptsQuery
      if (attemptsError) throw attemptsError

      // Build KC id to type map
      const kcTypeMap = {}
      kcs?.forEach(kc => {
        kcTypeMap[kc.id] = kc.knowledge_type
      })

      // Filter attempts by selected type if needed
      const filteredKcIds = new Set(
        selectedType === 'all'
          ? kcs?.map(kc => kc.id) || []
          : kcs?.filter(kc => kc.knowledge_type === selectedType).map(kc => kc.id) || []
      )

      // Aggregate by type
      const typeStats = {}
      const typeCounts = {}

      attempts?.forEach(attempt => {
        if (!filteredKcIds.has(attempt.kc_id)) return

        const type = kcTypeMap[attempt.kc_id] || 'unknown'
        if (!typeStats[type]) {
          typeStats[type] = { totalScore: 0, attempts: 0 }
          typeCounts[type] = new Set()
        }
        // Convert score (1-5) to percentage
        typeStats[type].totalScore += (attempt.score / 5) * 100
        typeStats[type].attempts++
        typeCounts[type].add(attempt.kc_id)
      })

      // Format result
      const result = Object.entries(typeStats).map(([type, stats]) => ({
        type,
        avgScore: stats.attempts > 0 ? stats.totalScore / stats.attempts : 0,
        attempts: stats.attempts,
        totalItems: typeCounts[type]?.size || 0
      }))

      setPerformanceByType(result)
    } catch (err) {
      console.error('Error fetching performance by type:', err)
      setPerformanceByType([])
    }
  }, [supabase, getDateFilter, selectedSource, selectedType])

  // Fetch calibration data (confidence vs actual performance)
  const fetchCalibrationData = useCallback(async () => {
    try {
      const dateFilter = getDateFilter()

      // Get KCs for source filter
      let kcIds = null
      if (selectedSource !== 'all' || selectedType !== 'all') {
        let kcsQuery = supabase
          .from('knowledge_components')
          .select('id, knowledge_type, source_id, name')

        if (selectedSource !== 'all') {
          kcsQuery = kcsQuery.eq('source_id', selectedSource)
        }
        if (selectedType !== 'all') {
          kcsQuery = kcsQuery.eq('knowledge_type', selectedType)
        }

        const { data: kcs } = await kcsQuery
        kcIds = kcs?.map(kc => kc.id) || []
      }

      // Get attempts with confidence and score
      let attemptsQuery = supabase
        .from('attempts')
        .select('kc_id, confidence_before, score, completed_at')
        .not('confidence_before', 'is', null)
        .not('score', 'is', null)

      if (dateFilter) {
        attemptsQuery = attemptsQuery.gte('completed_at', dateFilter)
      }

      const { data: attempts, error } = await attemptsQuery
      if (error) throw error

      // Filter by KC ids if needed
      let filtered = attempts || []
      if (kcIds !== null) {
        const kcIdSet = new Set(kcIds)
        filtered = filtered.filter(a => kcIdSet.has(a.kc_id))
      }

      // Format for scatter chart
      const result = filtered.map(attempt => ({
        confidence: (attempt.confidence_before / 5) * 100, // Convert 1-5 to percentage
        actualScore: (attempt.score / 5) * 100, // Convert 1-5 to percentage
        kcId: attempt.kc_id
      }))

      setCalibrationData(result)
    } catch (err) {
      console.error('Error fetching calibration data:', err)
      setCalibrationData([])
    }
  }, [supabase, getDateFilter, selectedSource, selectedType])

  // Fetch technique bundle effectiveness
  const fetchTechniqueData = useCallback(async () => {
    try {
      const dateFilter = getDateFilter()

      // Get technique bundles
      const { data: bundles, error: bundlesError } = await supabase
        .from('technique_bundles')
        .select('id, name')

      if (bundlesError) throw bundlesError

      // Get retention tests
      let testsQuery = supabase
        .from('retention_tests')
        .select('kc_id, delay_days, score, completed_at')
        .not('score', 'is', null)

      if (dateFilter) {
        testsQuery = testsQuery.gte('completed_at', dateFilter)
      }

      const { data: tests, error: testsError } = await testsQuery
      if (testsError) throw testsError

      // Get KC technique history
      const { data: history, error: historyError } = await supabase
        .from('kc_technique_history')
        .select('kc_id, technique_bundle_id')

      if (historyError) throw historyError

      // Build KC to bundle map
      const kcBundleMap = {}
      history?.forEach(h => {
        kcBundleMap[h.kc_id] = h.technique_bundle_id
      })

      // Aggregate retention by bundle and delay
      const bundleStats = {}
      bundles?.forEach(b => {
        bundleStats[b.id] = {
          name: b.name,
          retention7: { total: 0, count: 0 },
          retention30: { total: 0, count: 0 }
        }
      })

      tests?.forEach(test => {
        const bundleId = kcBundleMap[test.kc_id]
        if (!bundleId || !bundleStats[bundleId]) return

        const score = (test.score / 5) * 100 // Convert to percentage

        if (test.delay_days <= 7) {
          bundleStats[bundleId].retention7.total += score
          bundleStats[bundleId].retention7.count++
        } else if (test.delay_days <= 30) {
          bundleStats[bundleId].retention30.total += score
          bundleStats[bundleId].retention30.count++
        }
      })

      // Format result
      const result = Object.entries(bundleStats)
        .filter(([, stats]) => stats.retention7.count > 0 || stats.retention30.count > 0)
        .map(([, stats]) => ({
          name: stats.name,
          retention7Day: stats.retention7.count > 0
            ? stats.retention7.total / stats.retention7.count
            : 0,
          retention30Day: stats.retention30.count > 0
            ? stats.retention30.total / stats.retention30.count
            : 0
        }))

      setTechniqueData(result)
    } catch (err) {
      console.error('Error fetching technique data:', err)
      setTechniqueData([])
    }
  }, [supabase, getDateFilter])

  // Fetch items needing attention (struggling, low mastery, overdue)
  const fetchStrugglingItems = useCallback(async () => {
    try {
      // Get all KCs with their state
      let kcsQuery = supabase
        .from('knowledge_components')
        .select('id, name, knowledge_type, source_id')

      if (selectedSource !== 'all') {
        kcsQuery = kcsQuery.eq('source_id', selectedSource)
      }
      if (selectedType !== 'all') {
        kcsQuery = kcsQuery.eq('knowledge_type', selectedType)
      }

      const { data: kcs, error: kcsError } = await kcsQuery
      if (kcsError) throw kcsError

      // Get KC states
      const { data: states, error: statesError } = await supabase
        .from('kc_state')
        .select('kc_id, mastery_level, struggling_flag, next_review_at')

      if (statesError) throw statesError

      // Get recent attempts for difficulty ratings
      const { data: attempts, error: attemptsError } = await supabase
        .from('attempts')
        .select('kc_id, difficulty_rating')
        .not('difficulty_rating', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1000)

      if (attemptsError) throw attemptsError

      // Build state map
      const stateMap = {}
      states?.forEach(s => {
        stateMap[s.kc_id] = s
      })

      // Calculate average difficulty per KC
      const difficultyMap = {}
      attempts?.forEach(a => {
        if (!difficultyMap[a.kc_id]) {
          difficultyMap[a.kc_id] = { total: 0, count: 0 }
        }
        difficultyMap[a.kc_id].total += a.difficulty_rating
        difficultyMap[a.kc_id].count++
      })

      // Get source names
      const sourceMap = {}
      sources?.forEach(s => {
        sourceMap[s.id] = s.title
      })

      const now = new Date()
      const items = []

      kcs?.forEach(kc => {
        const state = stateMap[kc.id]
        const diffData = difficultyMap[kc.id]
        const avgDifficulty = diffData ? diffData.total / diffData.count : null

        // Check for struggling flag
        if (state?.struggling_flag) {
          items.push({
            kcId: kc.id,
            name: kc.name,
            knowledgeType: kc.knowledge_type,
            sourceId: kc.source_id,
            sourceName: sourceMap[kc.source_id],
            mastery: state.mastery_level,
            avgDifficulty,
            reason: 'struggling'
          })
          return
        }

        // Check for low mastery
        if (state?.mastery_level !== undefined && state.mastery_level < 0.3) {
          items.push({
            kcId: kc.id,
            name: kc.name,
            knowledgeType: kc.knowledge_type,
            sourceId: kc.source_id,
            sourceName: sourceMap[kc.source_id],
            mastery: state.mastery_level,
            avgDifficulty,
            reason: 'low_mastery'
          })
          return
        }

        // Check for high difficulty rating
        if (avgDifficulty && avgDifficulty >= 4) {
          items.push({
            kcId: kc.id,
            name: kc.name,
            knowledgeType: kc.knowledge_type,
            sourceId: kc.source_id,
            sourceName: sourceMap[kc.source_id],
            mastery: state?.mastery_level,
            avgDifficulty,
            reason: 'high_difficulty'
          })
          return
        }

        // Check for overdue items
        if (state?.next_review_at) {
          const reviewDate = new Date(state.next_review_at)
          const daysOverdue = (now - reviewDate) / (1000 * 60 * 60 * 24)
          if (daysOverdue > 7) {
            items.push({
              kcId: kc.id,
              name: kc.name,
              knowledgeType: kc.knowledge_type,
              sourceId: kc.source_id,
              sourceName: sourceMap[kc.source_id],
              mastery: state?.mastery_level,
              avgDifficulty,
              reason: 'overdue'
            })
          }
        }
      })

      // Sort by mastery level ascending (worst first)
      items.sort((a, b) => (a.mastery || 0) - (b.mastery || 0))

      setStrugglingItems(items.slice(0, 20)) // Limit to top 20
    } catch (err) {
      console.error('Error fetching struggling items:', err)
      setStrugglingItems([])
    }
  }, [supabase, sources, selectedSource, selectedType])

  // Fetch all data when filters change
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true)
      await Promise.all([
        fetchPerformanceByType(),
        fetchCalibrationData(),
        fetchTechniqueData(),
        fetchStrugglingItems()
      ])
      setLoading(false)
    }
    fetchAllData()
  }, [fetchPerformanceByType, fetchCalibrationData, fetchTechniqueData, fetchStrugglingItems])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-progress"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-text-primary">Analytics</h1>
        <p className="text-text-secondary mt-1">Deep insights into your learning patterns</p>
      </div>

      {/* Filter Controls */}
      <div className="bg-bg-card border border-bg-card-border rounded-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-text-secondary">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-text-muted" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="px-3 py-2 bg-white border border-bg-card-border rounded-button text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent"
            >
              {TIME_PERIODS.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-text-muted" />
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="px-3 py-2 bg-white border border-bg-card-border rounded-button text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent"
            >
              <option value="all">All Sources</option>
              {sources.map(source => (
                <option key={source.id} value={source.id}>
                  {source.title?.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                </option>
              ))}
            </select>
          </div>

          {/* Knowledge Type Filter */}
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-text-muted" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-white border border-bg-card-border rounded-button text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent"
            >
              {KNOWLEDGE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Insight Cards */}
      <InsightCards
        performanceData={performanceByType}
        calibrationData={calibrationData}
        strugglingItems={strugglingItems}
      />

      {/* Technique Bundle Effectiveness */}
      <TechniqueComparison data={techniqueData} />

      {/* Performance by Knowledge Type */}
      <PerformanceByType data={performanceByType} />

      {/* Calibration Analysis */}
      <CalibrationAnalysis data={calibrationData} />

      {/* Items Needing Attention */}
      <ItemsNeedingAttention items={strugglingItems} />
    </div>
  )
}
