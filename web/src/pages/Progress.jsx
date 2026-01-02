import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useSupabase } from '../contexts/SupabaseContext'
import StatCards from '../components/progress/StatCards'
import MasteryBySource from '../components/progress/MasteryBySource'
import WeeklyChart from '../components/progress/WeeklyChart'

export default function Progress() {
  const { supabase, getMasteryBySource } = useSupabase()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    sourcesCount: 0,
    itemsLearned: 0,
    sessionsCount: 0,
    totalMinutes: 0
  })
  const [masteryBySource, setMasteryBySource] = useState([])
  const [weeklyData, setWeeklyData] = useState([0, 0, 0, 0, 0, 0, 0])
  const [streak, setStreak] = useState(0)
  const [weeklyTotal, setWeeklyTotal] = useState(0)

  useEffect(() => {
    const fetchProgressData = async () => {
      setLoading(true)
      try {
        // Fetch all stats in parallel
        const [
          sourcesResult,
          itemsLearnedResult,
          sessionsResult,
          masteryData,
          weeklyActivityResult
        ] = await Promise.all([
          // Count sources
          supabase.from('content_sources').select('id', { count: 'exact', head: true }),
          // Count items learned (mastery_level > 0.5)
          supabase.from('kc_state').select('kc_id', { count: 'exact', head: true }).gt('mastery_level', 0.5),
          // Get sessions with duration
          supabase.from('sessions').select('id, actual_duration_minutes'),
          // Get mastery by source
          getMasteryBySource(),
          // Get attempts from the past week for weekly chart
          getWeeklyActivity()
        ])

        // Calculate total time from sessions
        const totalMinutes = sessionsResult.data?.reduce((sum, s) => sum + (s.actual_duration_minutes || 0), 0) || 0

        setStats({
          sourcesCount: sourcesResult.count || 0,
          itemsLearned: itemsLearnedResult.count || 0,
          sessionsCount: sessionsResult.data?.length || 0,
          totalMinutes
        })

        setMasteryBySource(masteryData || [])

        // Process weekly activity
        if (weeklyActivityResult) {
          setWeeklyData(weeklyActivityResult.dailyCounts)
          setWeeklyTotal(weeklyActivityResult.total)
          setStreak(weeklyActivityResult.streak)
        }
      } catch (err) {
        console.error('Error fetching progress data:', err)
      } finally {
        setLoading(false)
      }
    }

    const getWeeklyActivity = async () => {
      try {
        // Get the start of the current week (Monday)
        const today = new Date()
        const jsDay = today.getDay()
        const daysFromMonday = jsDay === 0 ? 6 : jsDay - 1
        const monday = new Date(today)
        monday.setDate(today.getDate() - daysFromMonday)
        monday.setHours(0, 0, 0, 0)

        // Get attempts from this week
        const { data: attempts, error } = await supabase
          .from('attempts')
          .select('started_at')
          .gte('started_at', monday.toISOString())
          .order('started_at', { ascending: true })

        if (error) throw error

        // Count attempts per day of the week (Mon-Sun)
        const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
        attempts?.forEach(attempt => {
          const attemptDate = new Date(attempt.started_at)
          const jsDay = attemptDate.getDay()
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1 // Monday = 0, Sunday = 6
          dailyCounts[dayIndex]++
        })

        const total = dailyCounts.reduce((sum, c) => sum + c, 0)

        // Calculate streak - count consecutive days with activity going backwards from today
        const streak = await calculateStreak()

        return { dailyCounts, total, streak }
      } catch (err) {
        console.error('Error getting weekly activity:', err)
        return { dailyCounts: [0, 0, 0, 0, 0, 0, 0], total: 0, streak: 0 }
      }
    }

    const calculateStreak = async () => {
      try {
        // Get all sessions ordered by date descending
        const { data: sessions, error } = await supabase
          .from('sessions')
          .select('started_at')
          .order('started_at', { ascending: false })

        if (error) throw error
        if (!sessions || sessions.length === 0) return 0

        // Get unique dates (in local time)
        const uniqueDates = new Set()
        sessions.forEach(s => {
          const date = new Date(s.started_at)
          const dateStr = date.toLocaleDateString('en-CA') // YYYY-MM-DD format
          uniqueDates.add(dateStr)
        })

        const sortedDates = Array.from(uniqueDates).sort().reverse()
        if (sortedDates.length === 0) return 0

        // Check if today or yesterday has activity (streak must be current)
        const today = new Date()
        const todayStr = today.toLocaleDateString('en-CA')
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        const yesterdayStr = yesterday.toLocaleDateString('en-CA')

        const mostRecentDate = sortedDates[0]
        if (mostRecentDate !== todayStr && mostRecentDate !== yesterdayStr) {
          return 0 // Streak is broken
        }

        // Count consecutive days
        let streak = 0
        let checkDate = new Date(mostRecentDate)

        for (const dateStr of sortedDates) {
          const checkDateStr = checkDate.toLocaleDateString('en-CA')
          if (dateStr === checkDateStr) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
          } else if (dateStr < checkDateStr) {
            // Gap found, streak ends
            break
          }
        }

        return streak
      } catch (err) {
        console.error('Error calculating streak:', err)
        return 0
      }
    }

    fetchProgressData()
  }, [supabase, getMasteryBySource])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-progress"></div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-text-primary mb-6">Progress</h1>

      <StatCards
        sourcesCount={stats.sourcesCount}
        itemsLearned={stats.itemsLearned}
        sessionsCount={stats.sessionsCount}
        totalMinutes={stats.totalMinutes}
      />

      <MasteryBySource sources={masteryBySource} />

      <WeeklyChart
        weeklyData={weeklyData}
        streak={streak}
        weeklyTotal={weeklyTotal}
      />

      <div className="text-center">
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1 text-accent-new hover:text-blue-700 font-medium transition-colors"
        >
          View detailed analytics
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
