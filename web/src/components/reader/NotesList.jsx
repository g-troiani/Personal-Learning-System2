import { useState } from 'react'
import { Plus, Trash2, FileText } from 'lucide-react'

/**
 * NotesList - Displays and manages notes for a document
 *
 * Props:
 * - notes: Array of note annotations
 * - onCreateNote: (noteText) => void
 * - onDeleteNote: (annotationId) => void
 */
export default function NotesList({ notes = [], onCreateNote, onDeleteNote }) {
  const [isEditing, setIsEditing] = useState(false)
  const [newNote, setNewNote] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (newNote.trim()) {
      onCreateNote?.(newNote.trim())
      setNewNote('')
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setNewNote('')
    setIsEditing(false)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full bg-gray-200">
      {/* Header with add button */}
      <div className="p-3 border-b border-gray-300">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-300 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add a note</span>
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Write your note..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg text-gray-700 placeholder-gray-400 focus:border-teal-500 focus:outline-none resize-none"
              rows={4}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Note
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">No notes yet</p>
            <p className="text-xs text-center mt-1">Add notes to capture your thoughts</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="group p-3 bg-white rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
              >
                {/* Note text */}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {note.note_content}
                </p>

                {/* Anchored text (if note was created from selection) */}
                {note.selected_text && (
                  <div className="mt-2 pl-2 border-l-2 border-gray-400">
                    <p className="text-xs text-gray-500 italic line-clamp-2">
                      "{note.selected_text}"
                    </p>
                  </div>
                )}

                {/* Footer with date and delete */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-400">
                    {formatDate(note.created_at)}
                  </span>
                  <button
                    onClick={() => onDeleteNote?.(note.id)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
