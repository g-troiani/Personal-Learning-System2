import { useState, useMemo, useEffect } from 'react'
import { Target, FileText } from 'lucide-react'
import { TextArea, SubmitButton, SkipButton, MicrophoneButton } from '../shared'
import useSpeechRecognition from '../../../hooks/useSpeechRecognition'

// Try to extract scenario from metadata or prompt
function parseScenario(item) {
  // Check metadata for structured scenario
  if (item?.metadata) {
    try {
      const meta = JSON.parse(item.metadata)
      if (meta.scenario) {
        return {
          scenario: meta.scenario,
          task: meta.task || item?.prompt
        }
      }
    } catch {
      // Not JSON
    }
  }

  // Try to split prompt into scenario and task
  // Common patterns: "Scenario: ... Task: ..." or "Given: ... What: ..."
  const prompt = item?.prompt || ''

  // Pattern 1: Scenario: ... Task: ...
  const scenarioMatch = prompt.match(/^(?:Scenario|Context|Given|Situation):\s*(.+?)(?:\s*(?:Task|Question|What|How|Your task):\s*(.+))?$/is)
  if (scenarioMatch) {
    return {
      scenario: scenarioMatch[1]?.trim() || prompt,
      task: scenarioMatch[2]?.trim() || null
    }
  }

  // Pattern 2: First paragraph is scenario, rest is task
  const paragraphs = prompt.split(/\n\n+/)
  if (paragraphs.length >= 2) {
    return {
      scenario: paragraphs[0].trim(),
      task: paragraphs.slice(1).join('\n\n').trim()
    }
  }

  // Fallback: no distinct scenario
  return { scenario: null, task: prompt }
}

export default function ApplicationInput({ item, onSubmit, onSkip, disabled }) {
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

  // Parse scenario from item
  const { scenario, task } = useMemo(() => parseScenario(item), [item])

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
      {/* Scenario Card */}
      {scenario && (
        <div className="bg-purple-50 border-l-4 border-purple-500 rounded-r-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-purple-700" />
            <h3 className="font-medium text-purple-800">Scenario</h3>
          </div>
          <p className="text-purple-900 text-sm leading-relaxed">{scenario}</p>
        </div>
      )}

      {/* Task Card (if separate from scenario) */}
      {task && scenario && (
        <div className="bg-gray-50 border border-gray-200 rounded-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-600" />
            <h4 className="font-medium text-gray-700 text-sm">Your Task</h4>
          </div>
          <p className="text-text-primary text-sm">{task}</p>
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <TextArea
            value={displayValue}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isListening ? 'Listening...' : 'Apply the concept to this scenario...'}
            rows={6}
            disabled={disabled}
            className="resize-y"
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
            Show how you'd apply this concept
          </p>
          <SubmitButton
            type="submit"
            disabled={disabled || !answer.trim()}
            variant="full"
          >
            Submit Response
          </SubmitButton>
        </div>
      </form>

      <div className="text-center">
        <SkipButton onClick={handleSkip} disabled={disabled} />
      </div>
    </div>
  )
}
