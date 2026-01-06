import { createContext, useContext, useState, useCallback } from 'react'

const ZenModeContext = createContext(null)

/**
 * ZenModeProvider - Manages zen mode state for distraction-free reading
 *
 * When zen mode is enabled:
 * - Sidebar is hidden (on reader routes)
 * - Assistant panel is hidden
 * - Only the document content is visible
 */
export function ZenModeProvider({ children }) {
  const [isZenMode, setIsZenMode] = useState(false)

  const toggleZenMode = useCallback(() => {
    setIsZenMode(prev => !prev)
  }, [])

  const exitZenMode = useCallback(() => {
    setIsZenMode(false)
  }, [])

  return (
    <ZenModeContext.Provider value={{ isZenMode, toggleZenMode, exitZenMode }}>
      {children}
    </ZenModeContext.Provider>
  )
}

export function useZenMode() {
  const context = useContext(ZenModeContext)
  if (!context) {
    throw new Error('useZenMode must be used within a ZenModeProvider')
  }
  return context
}
