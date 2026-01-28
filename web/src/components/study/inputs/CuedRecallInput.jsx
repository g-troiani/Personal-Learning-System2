import { useState, useMemo, useEffect } from 'react'
import { Lightbulb, ChevronDown } from 'lucide-react'
import { TextArea, SubmitButton, SkipButton, MicrophoneButton } from '../shared'
import useSpeechRecognition from '../../../hooks/useSpeechRecognition'

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

  // Speech recognition for dictation
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
    toggle: toggleSpeech,
    reset: resetSpeech,
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
  })

  // Append transcript to answer when speech is recognized
  useEffect(() => {
    if (transcript) {
      setAnswer(prev => {
        const separator = prev.trim() ? ' ' : ''
        return prev + separator + transcript
      })
      resetSpeech()
    }
  }, [transcript, resetSpeech])

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
      if (isListening) toggleSpeech()
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
    if (isListening) toggleSpeech()
    onSkip()
    setAnswer('')
    setHintsRevealed(0)
  }

  // Display value includes interim results while listening
  const displayValue = isListening && interimTranscript
    ? answer + (answer.trim() ? ' ' : '') + interimTranscript
    : answer

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
            value={displayValue}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Type or dictate your answer...'}
            rows={4}
            disabled={disabled}
            className="pr-28"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <MicrophoneButton
              isListening={isListening}
              isSupported={isSupported}
              disabled={disabled}
              onClick={toggleSpeech}
              error={speechError}
            />
            <SubmitButton
              type="submit"
              disabled={disabled || !answer.trim()}
              variant="icon"
            />
          </div>
        </div>
      </form>

      {/* Show listening indicator or error */}
      {isListening && (
        <div className="text-sm text-accent-progress flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Listening... speak now
        </div>
      )}
      {speechError && !isListening && (
        <div className="text-sm text-red-500">
          {speechError}
        </div>
      )}

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
