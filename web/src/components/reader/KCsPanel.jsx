import { useState, useEffect } from 'react'
import { Brain, Loader2, ChevronDown, ChevronRight, BookOpen } from 'lucide-react'
import { useSupabase } from '../../contexts/SupabaseContext'

/**
 * KCsPanel - Displays knowledge components extracted from the document
 *
 * Props:
 * - sourceId: ID of the current document
 */
export default function KCsPanel({ sourceId }) {
  const { supabase } = useSupabase()
  const [kcs, setKcs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedKc, setExpandedKc] = useState(null)

  // Fetch KCs for this source
  useEffect(() => {
    async function fetchKCs() {
      if (!sourceId || !supabase) return

      try {
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('knowledge_components')
          .select(`
            id,
            name,
            description,
            knowledge_type,
            cognitive_level,
            source_excerpt
          `)
          .eq('source_id', sourceId)
          .order('created_at', { ascending: true })

        if (fetchError) throw fetchError
        setKcs(data || [])
      } catch (err) {
        console.error('Error fetching KCs:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchKCs()
  }, [sourceId, supabase])

  const toggleExpand = (kcId) => {
    setExpandedKc(expandedKc === kcId ? null : kcId)
  }

  // Group KCs by type
  const kcsByType = kcs.reduce((acc, kc) => {
    const type = kc.knowledge_type || 'other'
    if (!acc[type]) acc[type] = []
    acc[type].push(kc)
    return acc
  }, {})

  const typeLabels = {
    factual: 'Facts & Definitions',
    conceptual: 'Concepts',
    procedural: 'Procedures',
    metacognitive: 'Metacognitive',
    other: 'Other'
  }

  const typeColors = {
    factual: 'text-blue-600 bg-blue-100',
    conceptual: 'text-purple-600 bg-purple-100',
    procedural: 'text-green-600 bg-green-100',
    metacognitive: 'text-amber-600 bg-amber-100',
    other: 'text-gray-600 bg-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading knowledge components...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400 p-4">
        <p className="text-sm text-center">{error}</p>
      </div>
    )
  }

  if (kcs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
        <Brain className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm text-center">No knowledge components yet</p>
        <p className="text-xs text-center mt-1">KCs are extracted during document processing</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-200">
      <div className="p-3">
        {/* Summary */}
        <div className="mb-4 p-2 bg-white rounded-lg border border-gray-300">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{kcs.length}</span> knowledge components extracted
          </p>
        </div>

        {/* KCs grouped by type */}
        {Object.entries(kcsByType).map(([type, typeKcs]) => (
          <div key={type} className="mb-4">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded ${typeColors[type] || typeColors.other}`}>
                {typeKcs.length}
              </span>
              {typeLabels[type] || type}
            </h3>

            <div className="space-y-1">
              {typeKcs.map((kc) => (
                <div
                  key={kc.id}
                  className="bg-white rounded-lg border border-gray-300 overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(kc.id)}
                    className="w-full flex items-start gap-2 p-2 text-left hover:bg-gray-100 transition-colors"
                  >
                    {expandedKc === kc.id ? (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium truncate">
                        {kc.name}
                      </p>
                      {!expandedKc && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {kc.description}
                        </p>
                      )}
                    </div>
                  </button>

                  {expandedKc === kc.id && (
                    <div className="px-4 pb-3 pt-1 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">
                        {kc.description}
                      </p>

                      {kc.source_excerpt && (
                        <div className="mt-2 pl-2 border-l-2 border-gray-400">
                          <p className="text-xs text-gray-500 italic">
                            "{kc.source_excerpt}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors[kc.knowledge_type] || typeColors.other}`}>
                          {kc.knowledge_type}
                        </span>
                        {kc.cognitive_level && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">
                            {kc.cognitive_level}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
