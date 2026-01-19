import { useState, useMemo } from 'react'
import { Lightbulb, ChevronDown } from 'lucide-react'
import { TextArea, SubmitButton, SkipButton } from '../shared'

// Parse hints from hints field (JSON array or comma-separated string)
function parseHints(hints) {
  if (!hints) return []

  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(hints)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Not JSON, try as plain text or comma-separated
    if (typeof hints === 'string') {
      if (hints.includes(',')) {
        return hints.split(',').map(s => s.trim()).filter(Boolean)
      }
      // Single hint
      if (hints.trim()) {
        return [hints.trim()]
      }
    }
  }

  return []
}

export default function CuedRecallInput({ item, onSubmit, onSkip, disabled }) {
  const [answer, setAnswer] = useState('')
  const [hintsRevealed, setHintsRevealed] = useState(0)

  // Parse hints once
  const hints = useMemo(() => parseHints(item?.hints), [item?.hints])
  const totalHints = hints.length
  const hasMoreHints = hintsRevealed < totalHints

  const handleRevealHint = () => {
    if (hasMoreHints) {
      setHintsRevealed(prev => prev + 1)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim() || disabled) {
      onSubmit({
        type: 'text',
        value: answer.trim(),
        hintsUsed: hintsRevealed
      })
      setAnswer('')
      setHintsRevealed(0)
    }
  }

  const handleSkip = () => {
    onSkip()
    setAnswer('')
    setHintsRevealed(0)
  }

  return (
    <div className="space-y-4">
      {/* Hint Section */}
      {totalHints > 0 && (
        <div className="space-y-3">
          {/* Revealed Hints */}
          {hintsRevealed > 0 && (
            <div className="space-y-2">
              {hints.slice(0, hintsRevealed).map((hint, index) => (
                <div
                  key={index}
                  className="bg-amber-50 border border-amber-200 rounded-card p-3 flex items-start gap-2"
                >
                  <Lightbulb className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                      Hint {index + 1}
                    </span>
                    <p className="text-amber-900 text-sm mt-0.5">{hint}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Show Hint Button */}
          {hasMoreHints && (
            <button
              type="button"
              onClick={handleRevealHint}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-button hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lightbulb className="w-4 h-4" />
              Show Hint ({totalHints - hintsRevealed} remaining)
              <ChevronDown className="w-4 h-4" />
            </button>
          )}

          {/* All hints revealed message */}
          {!hasMoreHints && hintsRevealed > 0 && (
            <p className="text-xs text-amber-600">
              All {totalHints} hint{totalHints > 1 ? 's' : ''} revealed
            </p>
          )}
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <TextArea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={4}
            disabled={disabled}
            className="pr-24"
          />
          <div className="absolute right-3 bottom-3">
            <SubmitButton
              type="submit"
              disabled={disabled || !answer.trim()}
              variant="icon"
            />
          </div>
        </div>
      </form>

      <div className="mt-4 text-center">
        <SkipButton onClick={handleSkip} disabled={disabled} />
      </div>

      {/* Hint usage indicator */}
      {hintsRevealed > 0 && (
        <p className="text-center text-xs text-text-muted">
          {hintsRevealed} hint{hintsRevealed > 1 ? 's' : ''} used
        </p>
      )}
    </div>
  )
}
