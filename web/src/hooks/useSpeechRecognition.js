import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Custom hook for browser-based speech recognition (dictation)
 * Uses Web Speech API with webkit prefix fallback for Safari
 *
 * @param {Object} options
 * @param {string} options.lang - Language code (default: 'en-US')
 * @param {boolean} options.continuous - Keep listening after speech ends (default: false)
 * @param {boolean} options.interimResults - Show results while speaking (default: true)
 * @param {function} options.onResult - Callback when speech is recognized
 * @param {function} options.onError - Callback when error occurs
 */
export default function useSpeechRecognition(options = {}) {
  const {
    lang = 'en-US',
    continuous = false,
    interimResults = true,
    onResult,
    onError,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const isListeningRef = useRef(false) // Sync ref to prevent race conditions

  // Initialize speech recognition on mount
  useEffect(() => {
    // Check for browser support (with webkit prefix for Safari)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    setIsSupported(true)

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = interimResults

    recognition.onstart = () => {
      isListeningRef.current = true
      setIsListening(true)
      setError(null)
    }

    recognition.onend = () => {
      isListeningRef.current = false
      setIsListening(false)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript)
        onResult?.(finalTranscript, true)
      }

      setInterimTranscript(interim)
      if (interim) {
        onResult?.(interim, false)
      }
    }

    recognition.onerror = (event) => {
      let errorMessage = ''

      switch (event.error) {
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access.'
          break
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'network':
          errorMessage = 'Network error. Please check your connection.'
          break
        case 'audio-capture':
          errorMessage = 'Microphone not found or not working.'
          break
        case 'aborted':
          errorMessage = 'Listening was cancelled.'
          break
        case 'service-not-allowed':
          errorMessage = 'Speech service is not available in this browser.'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }

      setError(errorMessage)
      setIsListening(false)
      onError?.(event.error, errorMessage)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [lang, continuous, interimResults, onResult, onError])

  const start = useCallback(() => {
    if (recognitionRef.current && !isListeningRef.current) {
      isListeningRef.current = true // Set synchronously to prevent double-start
      setTranscript('')
      setInterimTranscript('')
      setError(null)
      try {
        recognitionRef.current.start()
      } catch (e) {
        // Reset ref if start fails
        isListeningRef.current = false
        console.warn('Speech recognition start failed:', e.message)
      }
    }
  }, [])

  const stop = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const toggle = useCallback(() => {
    if (isListeningRef.current) {
      stop()
    } else {
      start()
    }
  }, [start, stop])

  const reset = useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    // State
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,

    // Actions
    start,
    stop,
    toggle,
    reset,
  }
}
