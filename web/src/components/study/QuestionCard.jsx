// Badge colors for knowledge types
const typeColors = {
  factual: { bg: 'bg-badge-factual', text: 'text-badge-factual-text' },
  conceptual: { bg: 'bg-purple-100', text: 'text-purple-700' },
  procedural_cognitive: { bg: 'bg-amber-100', text: 'text-amber-700' },
  procedural_execution: { bg: 'bg-green-100', text: 'text-green-700' },
}

// Practice mode display names
const modeLabels = {
  free_recall: 'Free recall',
  cued_recall: 'Cued recall',
  recognition: 'Recognition',
  explanation: 'Explanation',
  application: 'Application',
  execution: 'Execution',
}

export default function QuestionCard({ item, kc }) {
  const typeColor = typeColors[kc?.knowledge_type] || typeColors.factual
  const modeLabel = modeLabels[item?.practice_mode] || item?.practice_mode

  return (
    <div className="max-w-2xl mx-auto">
      {/* Badges */}
      <div className="flex gap-2 mb-4">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColor.bg} ${typeColor.text}`}>
          {kc?.knowledge_type?.replace('_', ' ') || 'Unknown'}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {modeLabel}
        </span>
      </div>

      {/* KC Name */}
      <h2 className="text-2xl font-semibold text-text-primary mb-6">
        {kc?.name || 'Loading...'}
      </h2>

      {/* Question Card */}
      <div className="bg-gray-50 rounded-card p-6 mb-6">
        <p className="text-lg text-text-primary leading-relaxed">
          {item?.prompt || 'Loading question...'}
        </p>
      </div>

      {/* Hints (if available) */}
      {item?.hints && (
        <details className="text-sm text-text-secondary">
          <summary className="cursor-pointer hover:text-text-primary">
            Show hints
          </summary>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            {(() => {
              try {
                // Try parsing as JSON array
                const parsed = JSON.parse(item.hints)
                if (Array.isArray(parsed)) {
                  return parsed.map((hint, i) => <li key={i}>{hint}</li>)
                }
                // If parsed but not array, show as single hint
                return <li>{String(parsed)}</li>
              } catch {
                // Not valid JSON, show as plain text
                return <li>{item.hints}</li>
              }
            })()}
          </ul>
        </details>
      )}
    </div>
  )
}
