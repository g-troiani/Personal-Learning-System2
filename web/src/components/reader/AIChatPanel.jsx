import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, AlertCircle, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'

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
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Add placeholder for streaming response
      const assistantMessageIndex = messages.length + 1
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      }])

      const response = await fetch(`${API_BASE_URL}/api/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
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

      // Handle SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.token) {
                fullContent += data.token
                // Update the streaming message
                setMessages(prev => prev.map((msg, idx) =>
                  idx === assistantMessageIndex
                    ? { ...msg, content: fullContent }
                    : msg
                ))
              } else if (data.done) {
                // Mark streaming as complete
                setMessages(prev => prev.map((msg, idx) =>
                  idx === assistantMessageIndex
                    ? { ...msg, isStreaming: false }
                    : msg
                ))
              } else if (data.error) {
                throw new Error(data.error)
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err) {
      console.error('AI chat error:', err)
      setError(err.message || 'Failed to get AI response')
      // Replace streaming placeholder with error or add error message
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1]
        if (lastMsg?.isStreaming) {
          // Replace placeholder with error
          return prev.slice(0, -1).concat({
            role: 'error',
            content: err.message || 'Failed to get AI response',
            timestamp: new Date().toISOString()
          })
        }
        // Add error message
        return [...prev, {
          role: 'error',
          content: err.message || 'Failed to get AI response',
          timestamp: new Date().toISOString()
        }]
      })
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
    <div className="flex flex-col h-full bg-gray-200">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 ai-chat-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
            <Sparkles className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-base text-center font-medium">Ask AI about this document</p>
            <p className="text-sm text-center mt-1 text-gray-400">
              Get explanations, summaries, or answers to your questions
            </p>

            {/* Suggested questions */}
            <div className="mt-4 space-y-2 w-full">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(question)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
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
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                )}
                {message.role === 'error' && (
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-base ${
                    message.role === 'user'
                      ? 'bg-teal-600 text-white'
                      : message.role === 'error'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  <p className="whitespace-pre-wrap">
                    {message.content}
                    {message.isStreaming && (
                      <span className="inline-block w-2 h-4 ml-0.5 bg-teal-600 animate-pulse" />
                    )}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-300">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isLoading) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask a question..."
            className="flex-1 px-3 py-2 text-base bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:border-teal-500 focus:outline-none"
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
