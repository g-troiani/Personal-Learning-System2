import { useState, useMemo, useEffect } from 'react'
import { BookOpen, List } from 'lucide-react'
import { TextArea, SubmitButton, SkipButton, MicrophoneButton } from '../shared'
import useSpeechRecognition from '../../../hooks/useSpeechRecognition'

// Parse rubric from JSON or string
function parseRubric(rubric) {
  if (!rubric) return null

  try {
    const parsed = JSON.parse(rubric)
    // Could be array of criteria or object with levels
    if (Array.isArray(parsed)) {
      return { type: 'list', items: parsed }
    }
    if (typeof parsed === 'object') {
      return { type: 'object', data: parsed }
    }
  } catch {
    // Plain text rubric
    if (typeof rubric === 'string' && rubric.trim()) {
      // Try to split by newlines or bullets
      const lines = rubric.split(/[\n\r]+|[•\-\*]\s+/).map(s => s.trim()).filter(Boolean)
      if (lines.length > 1) {
        return { type: 'list', items: lines }
      }
      return { type: 'text', content: rubric.trim() }
    }
  }

  return null
}

export default function ExplanationInput({ item, onSubmit, onSkip, disabled }) {
  const [answer, setAnswer] = useState('')

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

  // Parse rubric
  const rubric = useMemo(() => parseRubric(item?.rubric), [item?.rubric])

  // Display value includes interim results while listening
  const displayValue = isListening && interimTranscript
    ? answer + (answer.trim() ? ' ' : '') + interimTranscript
    : answer

  const wordCount = displayValue.trim() ? displayValue.trim().split(/\s+/).length : 0

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim() || disabled) {
      if (isListening) toggleSpeech()
      onSubmit({
        type: 'text',
        value: answer.trim(),
        wordCount: answer.trim() ? answer.trim().split(/\s+/).length : 0
      })
      setAnswer('')
    }
  }

  const handleSkip = () => {
    if (isListening) toggleSpeech()
    onSkip()
    setAnswer('')
  }

  return (
    <div className="space-y-4">
      {/* Rubric Preview */}
      {rubric && (
        <div className="bg-blue-50 border border-blue-200 rounded-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-700" />
            <h3 className="font-medium text-blue-800">Evaluation Criteria</h3>
          </div>

          {rubric.type === 'list' && (
            <ul className="space-y-2">
              {rubric.items.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-blue-800">
                  <List className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          )}

          {rubric.type === 'text' && (
            <p className="text-sm text-blue-800">{rubric.content}</p>
          )}

          {rubric.type === 'object' && (
            <div className="space-y-2 text-sm text-blue-800">
              {Object.entries(rubric.data).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}:</span>{' '}
                  <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <TextArea
            value={displayValue}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Write or dictate your explanation...'}
            rows={8}
            disabled={disabled}
            className="resize-y min-h-[200px]"
          />

          {/* Word Count and Microphone */}
          <div className="absolute bottom-3 left-3 text-xs text-text-muted">
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </div>
          <div className="absolute bottom-3 right-3">
            <MicrophoneButton
              isListening={isListening}
              isSupported={isSupported}
              disabled={disabled}
              onClick={toggleSpeech}
              error={speechError}
            />
          </div>
        </div>

        {/* Show listening indicator or error */}
        {isListening && (
          <div className="mt-2 text-sm text-accent-progress flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Listening... speak now
          </div>
        )}
        {speechError && !isListening && (
          <div className="mt-2 text-sm text-red-500">
            {speechError}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Provide a detailed explanation
          </p>
          <SubmitButton
            type="submit"
            disabled={disabled || !answer.trim()}
            variant="full"
          >
            Submit Explanation
          </SubmitButton>
        </div>
      </form>

      <div className="text-center">
        <SkipButton onClick={handleSkip} disabled={disabled} />
      </div>
    </div>
  )
}
