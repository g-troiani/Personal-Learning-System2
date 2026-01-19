import { useState, useMemo } from 'react'
import { Check } from 'lucide-react'
import { SkipButton } from '../shared'

// Parse options from hints field (JSON array or comma-separated string)
function parseOptions(hints, expectedResponse) {
  if (!hints) return null

  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(hints)
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return parsed
    }
  } catch {
    // Not JSON, try comma-separated
    if (typeof hints === 'string' && hints.includes(',')) {
      const parts = hints.split(',').map(s => s.trim()).filter(Boolean)
      if (parts.length >= 2) return parts
    }
  }

  return null
}

// Shuffle array with Fisher-Yates algorithm
function shuffleArray(array) {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function RecognitionInput({ item, onSubmit, onSkip, disabled }) {
  const [selectedIndex, setSelectedIndex] = useState(null)

  // Parse and shuffle options once on mount
  const { options, correctAnswer } = useMemo(() => {
    const opts = parseOptions(item?.hints, item?.expected_response)
    if (!opts) {
      return { options: null, correctAnswer: null }
    }

    // Expected response should match one of the options
    const correct = item?.expected_response
    const shuffled = shuffleArray(opts)

    return {
      options: shuffled,
      correctAnswer: correct
    }
  }, [item?.hints, item?.expected_response])

  const handleSelect = (index) => {
    if (disabled) return
    setSelectedIndex(index)
  }

  const handleConfirm = () => {
    if (selectedIndex === null || disabled) return

    const selectedOption = options[selectedIndex]
    const isCorrect = selectedOption === correctAnswer

    onSubmit({
      type: 'selection',
      value: selectedOption,
      selectedIndex,
      isCorrect,
      score: isCorrect ? 1.0 : 0.0
    })
  }

  const handleSkip = () => {
    onSkip()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return

    const key = e.key.toUpperCase()
    const letterIndex = OPTION_LETTERS.indexOf(key)
    if (letterIndex >= 0 && letterIndex < (options?.length || 0)) {
      setSelectedIndex(letterIndex)
      e.preventDefault()
    } else if (e.key === 'Enter' && selectedIndex !== null) {
      handleConfirm()
      e.preventDefault()
    }
  }

  // Fallback to free recall if options can't be parsed
  if (!options || options.length < 2) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-card p-4 text-amber-800">
        <p className="text-sm">
          This recognition item doesn't have properly formatted options.
          Please skip and report this item.
        </p>
        <div className="mt-4 text-center">
          <SkipButton onClick={handleSkip} disabled={disabled} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Options Grid */}
      <div className="grid gap-3">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index
          const letter = OPTION_LETTERS[index]

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(index)}
              disabled={disabled}
              className={`
                flex items-center gap-4 p-4 rounded-card border-2 text-left transition-all
                ${isSelected
                  ? 'border-accent-progress bg-green-50 ring-2 ring-accent-progress ring-opacity-50'
                  : 'border-bg-card-border bg-bg-card hover:border-gray-400 hover:bg-gray-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Letter Badge */}
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
                ${isSelected
                  ? 'bg-accent-progress text-white'
                  : 'bg-gray-200 text-gray-700'
                }
              `}>
                {isSelected ? <Check className="w-5 h-5" /> : letter}
              </div>

              {/* Option Text */}
              <span className={`flex-1 ${isSelected ? 'text-text-primary font-medium' : 'text-text-primary'}`}>
                {option}
              </span>
            </button>
          )
        })}
      </div>

      {/* Confirm Button */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={disabled || selectedIndex === null}
          className="w-full max-w-xs px-6 py-3 bg-btn-primary text-white rounded-button font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Confirm Answer
        </button>

        <SkipButton onClick={handleSkip} disabled={disabled}>
          Skip this question
        </SkipButton>
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-text-muted">
        Press A-{OPTION_LETTERS[Math.min(options.length - 1, 5)]} to select, Enter to confirm
      </p>
    </div>
  )
}
