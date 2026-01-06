import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Highlighter, Copy, Check } from 'lucide-react'

/**
 * SelectionTooltip - Floating toolbar that appears when text is selected
 *
 * Props:
 * - selection: Selection object from useTextSelection hook
 * - onAskAI: (selectedText) => void - Called when "Ask AI" is clicked
 * - onHighlight: (selection, color) => void - Called when "Highlight" is clicked
 * - onClose: () => void - Called when tooltip should close
 */
export default function SelectionTooltip({
  selection,
  onAskAI,
  onHighlight,
  onClose
}) {
  const [copied, setCopied] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const tooltipRef = useRef(null)

  // Highlight color options
  const colors = [
    { name: 'Yellow', value: '#FFEB3B' },
    { name: 'Green', value: '#81C784' },
    { name: 'Blue', value: '#64B5F6' },
    { name: 'Pink', value: '#F48FB1' },
    { name: 'Orange', value: '#FFB74D' }
  ]

  // Position tooltip above selection
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (selection?.rect && tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth

      // Calculate left position (centered on selection)
      let left = selection.rect.tooltipX - (tooltipRect.width / 2)

      // Keep tooltip within viewport
      if (left < 10) left = 10
      if (left + tooltipRect.width > viewportWidth - 10) {
        left = viewportWidth - tooltipRect.width - 10
      }

      // Position above selection
      const top = selection.rect.tooltipY - tooltipRect.height - 8

      setPosition({ top, left })
    }
  }, [selection])

  const handleCopy = async () => {
    if (selection?.text) {
      try {
        await navigator.clipboard.writeText(selection.text)
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
          onClose?.()
        }, 1500)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  const handleAskAI = () => {
    onAskAI?.(selection?.text)
    onClose?.()
  }

  const handleHighlight = (color) => {
    onHighlight?.(selection, color)
    setShowColorPicker(false)
    onClose?.()
  }

  if (!selection) return null

  return (
    <div
      ref={tooltipRef}
      className="selection-tooltip fixed z-50 flex items-center gap-1 px-2 py-1.5 bg-gray-900 rounded-lg shadow-lg animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`
      }}
    >
      {/* Ask AI */}
      <button
        onClick={handleAskAI}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-white hover:bg-gray-700 rounded transition-colors"
        title="Ask AI about this text"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Ask AI</span>
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Highlight - directly applies yellow highlight */}
      <button
        onClick={() => handleHighlight('#FFEB3B')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-white hover:bg-gray-700 rounded transition-colors"
        title="Highlight this text (yellow)"
      >
        <Highlighter className="w-4 h-4 text-yellow-400" />
        <span>Highlight</span>
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-white hover:bg-gray-700 rounded transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-green-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  )
}
