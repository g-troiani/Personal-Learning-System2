import { useState } from 'react'
import { Send } from 'lucide-react'

export default function AnswerInput({ onSubmit, onSkip, disabled }) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim() || disabled) {
      onSubmit(answer.trim())
      setAnswer('')
    }
  }

  const handleSkip = () => {
    onSkip()
    setAnswer('')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            rows={4}
            disabled={disabled}
            className="w-full px-4 py-3 pr-24 bg-bg-card border border-bg-card-border rounded-card text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-progress focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 bottom-3">
            <button
              type="submit"
              disabled={disabled || !answer.trim()}
              className="p-2 bg-btn-primary text-white rounded-button hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-4 text-center">
        <button
          onClick={handleSkip}
          disabled={disabled}
          className="text-text-secondary hover:text-text-primary text-sm underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Skip and show answer
        </button>
      </div>
    </div>
  )
}
