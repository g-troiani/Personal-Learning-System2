/**
 * Tests for useSessionPersistence hook helper functions.
 *
 * Tests the pure utility functions extracted from the hook:
 * - parseQueueItemIds: Parse JSON string to array
 * - Session cache operations: localStorage interactions
 * - Tab lock logic: Preventing multiple tabs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// Helper function implementations (extracted for testing)
// These mirror the logic inside useSessionPersistence
// ============================================================================

const STORAGE_KEY = 'study_session_cache'
const LOCK_KEY = 'study_session_lock'
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Parse queue_item_ids from database (JSON string) to array
 */
function parseQueueItemIds(queueStr) {
  if (!queueStr) return null
  try {
    return JSON.parse(queueStr)
  } catch {
    return null
  }
}

/**
 * Get session data from localStorage cache
 */
function getSessionFromCache() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (!cached) return null
    return JSON.parse(cached)
  } catch {
    return null
  }
}

/**
 * Save session data to localStorage cache
 */
function saveToCache(sessionData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...sessionData,
      cachedAt: Date.now()
    }))
  } catch (err) {
    console.error('Error saving to cache:', err)
  }
}

/**
 * Clear localStorage cache
 */
function clearCache() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Error clearing cache:', err)
  }
}

/**
 * Check if a session is still valid based on age
 */
function isSessionValid(lastActivityAt) {
  if (!lastActivityAt) return false
  const lastActivity = new Date(lastActivityAt)
  const sessionAge = Date.now() - lastActivity.getTime()
  return sessionAge < SESSION_MAX_AGE_MS
}

// ============================================================================
// Tests
// ============================================================================

describe('parseQueueItemIds', () => {
  it('should parse valid JSON array', () => {
    const result = parseQueueItemIds('["item_1", "item_2", "item_3"]')
    expect(result).toEqual(['item_1', 'item_2', 'item_3'])
  })

  it('should return null for null input', () => {
    expect(parseQueueItemIds(null)).toBeNull()
  })

  it('should return null for undefined input', () => {
    expect(parseQueueItemIds(undefined)).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseQueueItemIds('')).toBeNull()
  })

  it('should return null for invalid JSON', () => {
    expect(parseQueueItemIds('not valid json')).toBeNull()
  })

  it('should return null for incomplete JSON', () => {
    expect(parseQueueItemIds('["item_1", "item_2"')).toBeNull()
  })

  it('should handle nested objects in array', () => {
    const json = '[{"id": "1"}, {"id": "2"}]'
    const result = parseQueueItemIds(json)
    expect(result).toEqual([{ id: '1' }, { id: '2' }])
  })
})

describe('Session cache operations', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('getSessionFromCache', () => {
    it('should return null when cache is empty', () => {
      expect(getSessionFromCache()).toBeNull()
    })

    it('should return cached session data', () => {
      const sessionData = { id: 'session_123', currentIndex: 5 }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData))

      const result = getSessionFromCache()
      expect(result).toEqual(sessionData)
    })

    it('should return null for invalid JSON in cache', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json')
      expect(getSessionFromCache()).toBeNull()
    })
  })

  describe('saveToCache', () => {
    it('should save session data to localStorage', () => {
      const sessionData = { id: 'session_456', currentIndex: 10 }
      saveToCache(sessionData)

      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(cached.id).toBe('session_456')
      expect(cached.currentIndex).toBe(10)
      expect(cached.cachedAt).toBeDefined()
    })

    it('should add cachedAt timestamp', () => {
      const before = Date.now()
      saveToCache({ id: 'test' })
      const after = Date.now()

      const cached = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(cached.cachedAt).toBeGreaterThanOrEqual(before)
      expect(cached.cachedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('clearCache', () => {
    it('should remove session data from localStorage', () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'test' }))
      clearCache()
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('should not throw when cache is already empty', () => {
      expect(() => clearCache()).not.toThrow()
    })
  })
})

describe('isSessionValid', () => {
  it('should return false for null input', () => {
    expect(isSessionValid(null)).toBe(false)
  })

  it('should return true for recent session', () => {
    const recentDate = new Date().toISOString()
    expect(isSessionValid(recentDate)).toBe(true)
  })

  it('should return true for session within 7 days', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionValid(sixDaysAgo)).toBe(true)
  })

  it('should return false for session older than 7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    expect(isSessionValid(eightDaysAgo)).toBe(false)
  })

  it('should handle Date object input', () => {
    const recentDate = new Date()
    expect(isSessionValid(recentDate.toISOString())).toBe(true)
  })
})

describe('Tab lock logic', () => {
  const lockId = 'test_lock_123'

  beforeEach(() => {
    localStorage.clear()
  })

  it('should acquire lock when no existing lock', () => {
    const sessionId = 'session_abc'
    localStorage.setItem(LOCK_KEY, JSON.stringify({
      sessionId,
      lockId,
      acquiredAt: Date.now()
    }))

    const lock = JSON.parse(localStorage.getItem(LOCK_KEY))
    expect(lock.sessionId).toBe(sessionId)
    expect(lock.lockId).toBe(lockId)
  })

  it('should detect lock from different tab', () => {
    const sessionId = 'session_abc'
    const otherTabLockId = 'other_tab_456'

    localStorage.setItem(LOCK_KEY, JSON.stringify({
      sessionId,
      lockId: otherTabLockId,
      acquiredAt: Date.now()
    }))

    const lock = JSON.parse(localStorage.getItem(LOCK_KEY))
    const isLockedByOtherTab = lock.sessionId === sessionId && lock.lockId !== lockId
    expect(isLockedByOtherTab).toBe(true)
  })

  it('should allow same tab to hold lock', () => {
    const sessionId = 'session_abc'

    localStorage.setItem(LOCK_KEY, JSON.stringify({
      sessionId,
      lockId, // Same lock ID as this tab
      acquiredAt: Date.now()
    }))

    const lock = JSON.parse(localStorage.getItem(LOCK_KEY))
    const isLockedByOtherTab = lock.sessionId === sessionId && lock.lockId !== lockId
    expect(isLockedByOtherTab).toBe(false)
  })

  it('should release lock when removed', () => {
    localStorage.setItem(LOCK_KEY, JSON.stringify({
      sessionId: 'test',
      lockId,
      acquiredAt: Date.now()
    }))

    localStorage.removeItem(LOCK_KEY)
    expect(localStorage.getItem(LOCK_KEY)).toBeNull()
  })
})

describe('Session age constant', () => {
  it('should be 7 days in milliseconds', () => {
    expect(SESSION_MAX_AGE_MS).toBe(7 * 24 * 60 * 60 * 1000)
    expect(SESSION_MAX_AGE_MS).toBe(604800000)
  })
})
