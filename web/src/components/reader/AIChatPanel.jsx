import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, Bot, User, AlertCircle, Sparkles } from 'lucide-react'

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001'

/**
 * AIChatPanel - AI chat interface for asking questions about the document
 *
 * Props:
 * - sourceId: ID of the current document
 * - source: Source object with metadata
 * - initialMessage: Pre-filled message (from "Ask AI" selection)
 * - onClearInitialMessage: Clear the initial message after it's sent
 */
export default function AIChatPanel({
  sourceId,
  source,
  initialMessage,
  onClearInitialMessage
}) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Handle initial message from "Ask AI" button
  useEffect(() => {
    if (initialMessage) {
      setInput(`Explain this: "${initialMessage}"`)
      inputRef.current?.focus()
    }
  }, [initialMessage])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)
    onClearInitialMessage?.()

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }])

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source_id: sourceId,
          message: userMessage,
          context: {
            title: source?.title,
            domain: source?.domain
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to get AI response')
      }

      const data = await response.json()

      // Add AI response to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString()
      }])
    } catch (err) {
      console.error('AI chat error:', err)
      setError(err.message || 'Failed to get AI response')
      // Add error message to chat
      setMessages(prev => [...prev, {
        role: 'error',
        content: err.message || 'Failed to get AI response',
        timestamp: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedQuestions = [
    'Summarize this document',
    'What are the key concepts?',
    'Explain the main argument'
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <Sparkles className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm text-center font-medium">Ask AI about this document</p>
            <p className="text-xs text-center mt-1 text-gray-600">
              Get explanations, summaries, or answers to your questions
            </p>

            {/* Suggested questions */}
            <div className="mt-4 space-y-2 w-full">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(question)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-teal-600/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-teal-400" />
                  </div>
                )}
                {message.role === 'error' && (
                  <div className="w-6 h-6 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : message.role === 'error'
                      ? 'bg-red-900/30 text-red-300 border border-red-800/50'
                      : 'bg-gray-700 text-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-full bg-teal-600/20 flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="px-3 py-2 bg-gray-700 rounded-lg">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 text-sm bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-teal-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
