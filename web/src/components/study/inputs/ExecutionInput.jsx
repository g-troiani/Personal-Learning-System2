import { useState, useMemo } from 'react'
import { Play, CheckCircle, XCircle, ListChecks } from 'lucide-react'
import { SkipButton } from '../shared'

// Parse success criteria from JSON array or string
function parseSuccessCriteria(criteria) {
  if (!criteria) return []

  try {
    const parsed = JSON.parse(criteria)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // Not JSON, try as plain text
    if (typeof criteria === 'string') {
      // Split by newlines or bullet points
      const lines = criteria.split(/[\n\r]+|[•\-\*]\s+/).map(s => s.trim()).filter(Boolean)
      if (lines.length > 0) return lines
      // Single criterion
      if (criteria.trim()) return [criteria.trim()]
    }
  }

  return []
}

const INDEPENDENCE_LEVELS = [
  { value: 1, label: 'Full guidance', description: 'Needed step-by-step help' },
  { value: 2, label: 'Frequent help', description: 'Asked for help multiple times' },
  { value: 3, label: 'Some help', description: 'Got unstuck once or twice' },
  { value: 4, label: 'Minimal help', description: 'Quick hint or reference' },
  { value: 5, label: 'Fully independent', description: 'No external help needed' },
]

export default function ExecutionInput({ item, onSubmit, onSkip, disabled }) {
  const [stage, setStage] = useState('ready') // 'ready' | 'executing' | 'recording'
  const [taskStartTime, setTaskStartTime] = useState(null)
  const [completed, setCompleted] = useState(null)
  const [independenceLevel, setIndependenceLevel] = useState(null)
  const [iterations, setIterations] = useState(1)
  const [errors, setErrors] = useState('')

  // Parse success criteria
  const successCriteria = useMemo(() => parseSuccessCriteria(item?.success_criteria), [item?.success_criteria])

  const handleStartTask = () => {
    setTaskStartTime(Date.now())
    setStage('executing')
  }

  const handleRecordResults = () => {
    setStage('recording')
  }

  const handleSubmitResults = () => {
    if (completed === null || independenceLevel === null) return

    // Calculate score based on independence level
    // Level 1 = 0.0, Level 5 = 1.0
    const score = completed ? (independenceLevel - 1) / 4.0 : 0

    const taskDuration = taskStartTime ? Date.now() - taskStartTime : 0

    onSubmit({
      type: 'completion',
      value: completed ? 'completed' : 'not_completed',
      completed,
      independenceLevel,
      iterations,
      errors: errors.trim() || null,
      taskDurationMs: taskDuration,
      score,
      isCorrect: completed && independenceLevel >= 3 // Considered "correct" if completed with at least some independence
    })

    // Reset state
    setStage('ready')
    setCompleted(null)
    setIndependenceLevel(null)
    setIterations(1)
    setErrors('')
  }

  const handleSkip = () => {
    onSkip()
    setStage('ready')
  }

  // Stage 1: Ready to start
  if (stage === 'ready') {
    return (
      <div className="space-y-6">
        {/* Success Criteria */}
        {successCriteria.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks className="w-5 h-5 text-green-700" />
              <h3 className="font-medium text-green-800">Success Criteria</h3>
            </div>
            <ul className="space-y-2">
              {successCriteria.map((criterion, index) => (
                <li key={index} className="flex items-start gap-2 text-green-800">
                  <span className="w-5 h-5 rounded-full bg-green-200 text-green-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span className="text-sm">{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Instructions */}
        <p className="text-text-secondary text-sm text-center">
          Complete this task in your environment, then return here to record your results.
        </p>

        {/* Start Task Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={handleStartTask}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-5 h-5" />
            Start Task
          </button>

          <SkipButton onClick={handleSkip} disabled={disabled}>
            Skip this task
          </SkipButton>
        </div>
      </div>
    )
  }

  // Stage 2: Executing (user is doing the task externally)
  if (stage === 'executing') {
    return (
      <div className="space-y-6 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent-progress bg-opacity-20 flex items-center justify-center">
            <Play className="w-8 h-8 text-accent-progress" />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-text-primary mb-2">Task in Progress</h3>
          <p className="text-text-secondary text-sm">
            Complete the task in your environment, then click below to record your results.
          </p>
        </div>

        {/* Success Criteria Reminder */}
        {successCriteria.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-card p-3 text-left">
            <p className="text-xs font-medium text-gray-600 mb-2">Remember to:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {successCriteria.map((criterion, index) => (
                <li key={index}>• {criterion}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleRecordResults}
          className="px-6 py-3 bg-accent-progress text-white rounded-button font-medium hover:opacity-90 transition-opacity"
        >
          Record Results
        </button>
      </div>
    )
  }

  // Stage 3: Recording results
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-text-primary text-center">Record Your Results</h3>

      {/* Completion Status */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-3">
          Did you complete the task?
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setCompleted(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-button border-2 transition-all ${
              completed === true
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
            }`}
          >
            <CheckCircle className="w-5 h-5" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => setCompleted(false)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-button border-2 transition-all ${
              completed === false
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white text-text-secondary hover:border-gray-300'
            }`}
          >
            <XCircle className="w-5 h-5" />
            No
          </button>
        </div>
      </div>

      {/* Independence Level (only show if completed) */}
      {completed === true && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-3">
            How much help did you need?
          </label>
          <div className="grid gap-2">
            {INDEPENDENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => setIndependenceLevel(level.value)}
                className={`flex items-center gap-3 p-3 rounded-card border-2 text-left transition-all ${
                  independenceLevel === level.value
                    ? 'border-accent-progress bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  independenceLevel === level.value
                    ? 'bg-accent-progress text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {level.value}
                </div>
                <div>
                  <div className={`font-medium ${independenceLevel === level.value ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {level.label}
                  </div>
                  <div className="text-xs text-text-muted">{level.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Iterations (only show if completed) */}
      {completed === true && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            How many attempts did it take?
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIterations(prev => Math.max(1, prev - 1))}
              className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
            >
              -
            </button>
            <span className="w-12 text-center text-lg font-semibold text-text-primary">
              {iterations}
            </span>
            <button
              type="button"
              onClick={() => setIterations(prev => prev + 1)}
              className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Errors/Notes (optional) */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Errors or notes (optional)
        </label>
        <textarea
          value={errors}
          onChange={(e) => setErrors(e.target.value)}
          placeholder="Any errors encountered or notes about the process..."
          rows={2}
          className="w-full px-3 py-2 bg-bg-card border border-bg-card-border rounded-card text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent resize-none text-sm"
        />
      </div>

      {/* Submit Button */}
      <button
        type="button"
        onClick={handleSubmitResults}
        disabled={completed === null || (completed && independenceLevel === null)}
        className="w-full py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Submit Results
      </button>
    </div>
  )
}
