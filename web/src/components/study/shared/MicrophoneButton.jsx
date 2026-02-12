import { Mic, MicOff } from 'lucide-react'

/**
 * Microphone button for speech-to-text dictation
 * Shows different states: idle, listening (pulsing red), processing
 *
 * @param {Object} props
 * @param {boolean} props.isListening - Whether currently recording
 * @param {boolean} props.isSupported - Whether browser supports speech recognition
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {function} props.onClick - Click handler (toggle recording)
 * @param {string} props.error - Error message to show as tooltip
 * @param {string} props.className - Additional CSS classes
 */
export default function MicrophoneButton({
  isListening = false,
  isSupported = true,
  disabled = false,
  onClick,
  error,
  className = '',
}) {
  // Don't render if browser doesn't support speech recognition
  if (!isSupported) {
    return null
  }

  const baseClasses = 'p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'

  const stateClasses = isListening
    ? 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 animate-pulse'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-accent-progress'

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isListening ? 'Stop dictation' : 'Start dictation'}
      aria-pressed={isListening}
      title={error || (isListening ? 'Click to stop recording' : 'Click to dictate your answer')}
      className={`${baseClasses} ${stateClasses} ${disabledClasses} ${className}`}
    >
      {isListening ? (
        <MicOff size={18} />
      ) : (
        <Mic size={18} />
      )}
    </button>
  )
}
