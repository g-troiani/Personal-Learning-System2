import { useState, useEffect } from 'react'
import { TextArea, SubmitButton, SkipButton, MicrophoneButton } from '../shared'
import useSpeechRecognition from '../../../hooks/useSpeechRecognition'

export default function FreeRecallInput({ item, onSubmit, onSkip, disabled }) {
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (answer.trim() || disabled) {
      if (isListening) toggleSpeech()
      onSubmit({
        type: 'text',
        value: answer.trim()
      })
      setAnswer('')
    }
  }

  const handleSkip = () => {
    if (isListening) toggleSpeech()
    onSkip()
    setAnswer('')
  }

  // Display value includes interim results while listening
  const displayValue = isListening && interimTranscript
    ? answer + (answer.trim() ? ' ' : '') + interimTranscript
    : answer

  return (
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

      <div className="mt-4 text-center">
        <SkipButton onClick={handleSkip} disabled={disabled} />
      </div>
    </form>
  )
}
