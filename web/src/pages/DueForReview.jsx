import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupabase } from '../contexts/SupabaseContext'
import ReviewSection from '../components/review/ReviewSection'
import { BookOpen } from 'lucide-react'

export default function DueForReview() {
  const navigate = useNavigate()
  const { getDueCounts, sources } = useSupabase()
  const [dueCounts, setDueCounts] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const data = await getDueCounts()
      setDueCounts(data)
      setLoading(false)
    }
    fetchData()
  }, [getDueCounts])

  // Build source data with domain info from sources context
  const buildSourceData = () => {
    if (!dueCounts?.bySource || !sources) return { overdue: [], dueToday: [], newContent: [] }

    // Create a map of source id to source data
    const sourceMap = {}
    sources.forEach(s => {
      sourceMap[s.id] = s
    })

    // Categorize sources
    const overdue = []
    const dueToday = []
    const newContent = []

    dueCounts.bySource.forEach(item => {
      const sourceData = sourceMap[item.id] || {}
      const enrichedSource = {
        ...item,
        domain: sourceData.domain || 'general',
        emoji: sourceData.emoji,
      }

      if (item.overdue > 0) {
        overdue.push(enrichedSource)
      }
      if (item.dueToday > 0) {
        dueToday.push(enrichedSource)
      }
      if (item.newContent > 0) {
        newContent.push(enrichedSource)
      }
    })

    // Sort each category by count (highest first)
    overdue.sort((a, b) => b.overdue - a.overdue)
    dueToday.sort((a, b) => b.dueToday - a.dueToday)
    newContent.sort((a, b) => b.newContent - a.newContent)

    return { overdue, dueToday, newContent }
  }

  const { overdue, dueToday, newContent } = buildSourceData()
  const totalItems = (dueCounts?.overdue || 0) + (dueCounts?.dueToday || 0) + (dueCounts?.newContent || 0)

  const handleStudyAll = () => {
    navigate('/study')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-progress"></div>
      </div>
    )
  }

  const hasNoItems = overdue.length === 0 && dueToday.length === 0 && newContent.length === 0

  return (
    <div>
      <h1 className="text-3xl font-semibold text-text-primary mb-6">Due for Review</h1>

      {hasNoItems ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <p className="text-text-secondary text-lg mb-2">All caught up!</p>
          <p className="text-text-muted">No items are due for review right now.</p>
        </div>
      ) : (
        <>
          <ReviewSection
            title="Overdue"
            sources={overdue}
            category="overdue"
            dotColor="red"
          />

          <ReviewSection
            title="Due Today"
            sources={dueToday}
            category="dueToday"
            dotColor="amber"
          />

          <ReviewSection
            title="New Content"
            sources={newContent}
            category="newContent"
            dotColor="green"
          />

          {/* Study All Button */}
          <div className="mt-8 pt-6 border-t border-bg-card-border">
            <div className="flex items-center justify-between">
              <p className="text-text-secondary">
                Review everything at once?
              </p>
              <button
                onClick={handleStudyAll}
                className="px-6 py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors"
              >
                Study All ({totalItems} items)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
