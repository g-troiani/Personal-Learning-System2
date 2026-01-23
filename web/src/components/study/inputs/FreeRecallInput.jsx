import { useState } from 'react'
import { TextArea, SubmitButton, SkipButton } from '../shared'

export default function FreeRecallInput({ item, onSubmit, onSkip, disabled }) {
  const [answer, setAnswer] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim() || disabled) {
      onSubmit({
        type: 'text',
        value: answer.trim()
      })
      setAnswer('')
    }
  }

  const handleSkip = () => {
    onSkip()
    setAnswer('')
  }

  return (
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

      <div className="mt-4 text-center">
        <SkipButton onClick={handleSkip} disabled={disabled} />
      </div>
    </form>
  )
}
