import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Brain, FileText, Clock, AlertCircle, BookOpen, Calendar, ChevronDown, ChevronUp, Play, Trash2 } from 'lucide-react'
import { useSupabase } from '../../contexts/SupabaseContext'

// Domain badge colors (same as SourcesList)
const domainColors = {
  'ai_ml': 'bg-purple-100 text-purple-700',
  'programming': 'bg-blue-100 text-blue-700',
  'math': 'bg-orange-100 text-orange-700',
  'science': 'bg-green-100 text-green-700',
  'history': 'bg-amber-100 text-amber-700',
  'language': 'bg-pink-100 text-pink-700',
  'business': 'bg-indigo-100 text-indigo-700',
  'health': 'bg-red-100 text-red-700',
  'general': 'bg-gray-100 text-gray-700',
}

const domainLabels = {
  'ai_ml': 'AI/ML',
  'programming': 'Programming',
  'math': 'Math',
  'science': 'Science',
  'history': 'History',
  'language': 'Language',
  'business': 'Business',
  'health': 'Health',
  'general': 'General'
}

// Knowledge type badge colors
const kcTypeColors = {
  'factual': 'bg-blue-100 text-blue-700',
  'conceptual': 'bg-purple-100 text-purple-700',
  'procedural_cognitive': 'bg-orange-100 text-orange-700',
  'procedural_execution': 'bg-green-100 text-green-700',
}

const kcTypeLabels = {
  'factual': 'Factual',
  'conceptual': 'Conceptual',
  'procedural_cognitive': 'Procedural (Cognitive)',
  'procedural_execution': 'Procedural (Execution)',
}

// Source emoji mapping
const domainEmojis = {
  'ai_ml': '🤖',
  'programming': '💻',
  'math': '📐',
  'science': '🔬',
  'history': '📜',
  'language': '📚',
  'business': '💼',
  'health': '🏥',
  'general': '📖',
}

/**
 * SourceDetailPanel - A modal/drawer that shows full details of a source
 *
 * Props:
 * - source: The source object to display
 * - isOpen: boolean - Whether the panel is visible
 * - onClose: () => void - Called when panel should close
 * - onDelete: (source) => void - Called when user wants to delete the source
 */
export default function SourceDetailPanel({ source, isOpen, onClose, onDelete }) {
  const navigate = useNavigate()
  const { supabase } = useSupabase()
  const panelRef = useRef(null)

  const [knowledgeComponents, setKnowledgeComponents] = useState([])
  const [kcStates, setKcStates] = useState({})
  const [itemCounts, setItemCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedKcs, setExpandedKcs] = useState({})

  // Fetch KCs and their states when panel opens
  useEffect(() => {
    if (isOpen && source) {
      fetchSourceDetails()
    }
  }, [isOpen, source?.id])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const fetchSourceDetails = async () => {
    if (!source?.id) return

    setLoading(true)
    try {
      // Fetch KCs for this source
      const { data: kcs, error: kcError } = await supabase
        .from('knowledge_components')
        .select('*')
        .eq('source_id', source.id)
        .order('created_at', { ascending: true })

      if (kcError) throw kcError

      setKnowledgeComponents(kcs || [])

      // Fetch KC states
      const kcIds = (kcs || []).map(kc => kc.id)
      if (kcIds.length > 0) {
        const { data: states, error: stateError } = await supabase
          .from('kc_state')
          .select('*')
          .in('kc_id', kcIds)

        if (stateError) throw stateError

        // Create lookup map
        const stateMap = {}
        ;(states || []).forEach(s => {
          stateMap[s.kc_id] = s
        })
        setKcStates(stateMap)

        // Fetch item counts per KC
        const { data: items, error: itemError } = await supabase
          .from('practice_items')
          .select('kc_id')
          .in('kc_id', kcIds)

        if (itemError) throw itemError

        // Count items per KC
        const counts = {}
        ;(items || []).forEach(item => {
          counts[item.kc_id] = (counts[item.kc_id] || 0) + 1
        })
        setItemCounts(counts)
      }
    } catch (err) {
      console.error('Error fetching source details:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleKcExpanded = (kcId) => {
    setExpandedKcs(prev => ({
      ...prev,
      [kcId]: !prev[kcId]
    }))
  }

  const handleStudy = () => {
    navigate(`/study?source=${source.id}`)
    onClose()
  }

  const handleDelete = () => {
    if (onDelete) {
      onDelete(source)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !source) return null

  const emoji = source.emoji || domainEmojis[source.domain] || '📖'
  const totalItems = Object.values(itemCounts).reduce((sum, count) => sum + count, 0)

  // Group KCs by type
  const kcsByType = knowledgeComponents.reduce((acc, kc) => {
    const type = kc.knowledge_type || 'general'
    if (!acc[type]) acc[type] = []
    acc[type].push(kc)
    return acc
  }, {})

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{emoji}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{source.title}</h2>
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${domainColors[source.domain] || domainColors.general}`}>
                  {domainLabels[source.domain] || source.domain}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                <Brain className="w-4 h-4" />
                <span className="text-sm">Concepts</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{knowledgeComponents.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Items</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{totalItems}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
                <BookOpen className="w-4 h-4" />
                <span className="text-sm">Mastery</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-600">{source.mastery || 0}%</p>
            </div>
          </div>

          {/* Due items summary */}
          <div className="flex flex-wrap gap-3 mb-6">
            {source.overdueCount > 0 && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                {source.overdueCount} overdue
              </span>
            )}
            {source.dueCount > 0 && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium">
                <Clock className="w-4 h-4" />
                {source.dueCount} due today
              </span>
            )}
            {source.newCount > 0 && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium">
                {source.newCount} new
              </span>
            )}
            {!source.overdueCount && !source.dueCount && !source.newCount && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium">
                All caught up!
              </span>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Document Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Ingested</span>
                <span className="text-gray-900">{formatDate(source.ingested_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Word Count</span>
                <span className="text-gray-900">{source.word_count?.toLocaleString() || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Content Type</span>
                <span className="text-gray-900 uppercase">{source.content_type || 'text'}</span>
              </div>
              {source.processing_completed_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Processed</span>
                  <span className="text-gray-900">{formatDate(source.processing_completed_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Knowledge Components */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">
              Knowledge Components ({knowledgeComponents.length})
            </h3>

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : knowledgeComponents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No knowledge components extracted yet.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(kcsByType).map(([type, kcs]) => (
                  <div key={type} className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${kcTypeColors[type] || 'bg-gray-100 text-gray-700'}`}>
                        {kcTypeLabels[type] || type}
                      </span>
                      <span className="text-xs text-gray-500">({kcs.length})</span>
                    </div>
                    <div className="space-y-1">
                      {kcs.map(kc => {
                        const state = kcStates[kc.id]
                        const itemCount = itemCounts[kc.id] || 0
                        const mastery = state?.mastery_level ? Math.round(state.mastery_level * 100) : 0
                        const isExpanded = expandedKcs[kc.id]

                        return (
                          <div
                            key={kc.id}
                            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                          >
                            <button
                              onClick={() => toggleKcExpanded(kc.id)}
                              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <p className="font-medium text-gray-900 text-sm truncate">{kc.name}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span>{itemCount} items</span>
                                  <span>{mastery}% mastery</span>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                                <p className="text-sm text-gray-600 mt-2">{kc.description}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all"
                                      style={{ width: `${mastery}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-500 w-12 text-right">{mastery}%</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={handleStudy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <Play className="w-4 h-4" />
            Study Now
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
