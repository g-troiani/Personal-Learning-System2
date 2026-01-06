import { useState, useEffect, useRef } from 'react'
import { MessageSquare, FileText, Brain, X, ChevronLeft, ChevronRight } from 'lucide-react'
import NotesList from './NotesList'
import AIChatPanel from './AIChatPanel'
import KCsPanel from './KCsPanel'

/**
 * AssistantPanel - Right-side collapsible panel with Notes, AI Chat, and KCs tabs
 *
 * Props:
 * - sourceId: ID of the current document
 * - source: Source object with metadata
 * - notes: Array of note annotations from useAnnotations
 * - onCreateNote: (noteText) => void
 * - onDeleteNote: (annotationId) => void
 * - onAskAI: Callback when AI chat is used
 * - initialMessage: Pre-filled message for AI chat (from "Ask AI" button)
 * - onClearInitialMessage: Clear the initial message after it's used
 */
export default function AssistantPanel({
  sourceId,
  source,
  notes = [],
  onCreateNote,
  onDeleteNote,
  initialMessage,
  onClearInitialMessage
}) {
  const [activeTab, setActiveTab] = useState('notes')
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Auto-switch to AI tab when initial message is provided
  useEffect(() => {
    if (initialMessage) {
      setActiveTab('ai')
      setIsCollapsed(false)
    }
  }, [initialMessage])

  const tabs = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'ai', label: 'AI', icon: MessageSquare },
    { id: 'kcs', label: 'KCs', icon: Brain }
  ]

  if (isCollapsed) {
    return (
      <div className="w-10 border-l border-gray-300 bg-gray-200 flex flex-col items-center py-4">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-gray-300 text-gray-500 hover:text-gray-700 transition-colors"
          title="Expand panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center gap-2 mt-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setIsCollapsed(false)
              }}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-100 text-teal-600'
                  : 'text-gray-500 hover:bg-gray-300 hover:text-gray-700'
              }`}
              title={tab.label}
            >
              <tab.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-[27rem] border-l border-gray-300 bg-gray-200 flex flex-col">
      {/* Header with tabs */}
      <div className="flex items-center justify-between border-b border-gray-300 px-2 bg-gray-100">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-teal-600 border-teal-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.id === 'notes' && notes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-300 text-gray-600">
                  {notes.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded hover:bg-gray-300 text-gray-500 hover:text-gray-700 transition-colors"
          title="Collapse panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'notes' && (
          <NotesList
            notes={notes}
            onCreateNote={onCreateNote}
            onDeleteNote={onDeleteNote}
          />
        )}
        {activeTab === 'ai' && (
          <AIChatPanel
            sourceId={sourceId}
            source={source}
            initialMessage={initialMessage}
            onClearInitialMessage={onClearInitialMessage}
          />
        )}
        {activeTab === 'kcs' && (
          <KCsPanel sourceId={sourceId} />
        )}
      </div>
    </div>
  )
}
