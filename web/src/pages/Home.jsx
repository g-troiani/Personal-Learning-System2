import { useState, useEffect, lazy, Suspense } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import GreetingHeader from '../components/home/GreetingHeader'
import OverdueAlert from '../components/home/OverdueAlert'
import SearchBar from '../components/home/SearchBar'
import QuickActions from '../components/home/QuickActions'
import SourceCard from '../components/home/SourceCard'

const LearningContributionGraph = lazy(() =>
  import('../components/home/contribution-graph/LearningContributionGraph')
)

export default function Home() {
  const { sources, loading: contextLoading, fetchSources, getDueCounts, getMasteryBySource } = useSupabase()
  const [searchQuery, setSearchQuery] = useState('')
  const [dueCounts, setDueCounts] = useState(null)
  const [masteryBySource, setMasteryBySource] = useState([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // Refresh sources silently in background (handles deletions from other pages)
      await fetchSources()
      const [dueData, masteryData] = await Promise.all([
        getDueCounts(),
        getMasteryBySource()
      ])
      setDueCounts(dueData)
      setMasteryBySource(masteryData)
      setDataLoaded(true)
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount - functions are stable from context

  // Create a map of source id to mastery and due counts
  const sourceDataMap = {}
  masteryBySource.forEach(s => {
    sourceDataMap[s.id] = { mastery: s.mastery }
  })
  dueCounts?.bySource?.forEach(s => {
    if (!sourceDataMap[s.id]) {
      sourceDataMap[s.id] = {}
    }
    sourceDataMap[s.id].dueToday = s.dueToday
    sourceDataMap[s.id].overdue = s.overdue
    sourceDataMap[s.id].newContent = s.newContent
  })

  // Filter sources by search query
  const filteredSources = sources.filter(source =>
    source.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearch = (query) => {
    console.log('Search:', query)
  }

  // Only show spinner on very first app load when context has no data yet
  // Once context has loaded (even with empty data), show UI immediately
  if (contextLoading && !dataLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-progress"></div>
      </div>
    )
  }

  return (
    <div>
      <GreetingHeader />

      <OverdueAlert overdueCount={dueCounts?.overdue || 0} />

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={handleSearch}
      />

      <QuickActions />

      <Suspense fallback={
        <div className="bg-bg-card border border-bg-card-border rounded-card p-6 mb-6 h-40 animate-pulse" />
      }>
        <LearningContributionGraph className="mb-8" />
      </Suspense>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Your Sources</h2>

        {filteredSources.length === 0 ? (
          <div className="text-center py-12 text-text-secondary">
            <p>No sources found. Add a document to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSources.map(source => {
              const data = sourceDataMap[source.id] || {}
              return (
                <SourceCard
                  key={source.id}
                  source={source}
                  mastery={data.mastery || 0}
                  dueCount={data.dueToday || 0}
                  overdueCount={data.overdue || 0}
                />
              )
            })}
          </div>
        )}
      </div>

      {dueCounts && (
        <div className="mt-8 p-4 bg-bg-card border border-bg-card-border rounded-card">
          <h3 className="font-medium text-text-primary mb-2">Quick Stats</h3>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-text-secondary">Total Sources:</span>{' '}
              <span className="font-medium text-text-primary">{sources.length}</span>
            </div>
            <div>
              <span className="text-text-secondary">New Items:</span>{' '}
              <span className="font-medium text-accent-new">{dueCounts.newContent}</span>
            </div>
            <div>
              <span className="text-text-secondary">Due Today:</span>{' '}
              <span className="font-medium text-accent-alert">{dueCounts.dueToday}</span>
            </div>
            <div>
              <span className="text-text-secondary">Overdue:</span>{' '}
              <span className="font-medium text-accent-overdue">{dueCounts.overdue}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
