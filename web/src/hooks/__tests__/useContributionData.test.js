import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useContributionData } from '../useContributionData'

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}))

// Helper: wire up a fluent chain for the `attempts` table
function mockAttemptsChain(data, error = null) {
  const chain = {
    select: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve({ data, error })),
  }
  return chain
}

// Helper: wire up a fluent chain for the `knowledge_components` table
function mockKcsChain(data, error = null) {
  const chain = {
    select: vi.fn(() => Promise.resolve({ data, error })),
  }
  return chain
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TODAY = '2026-01-28'

const SAMPLE_KCS = [
  { id: 'kc_1', source_id: 'src_a', source: { id: 'src_a', title: 'Cognitive Science', domain: null } },
  { id: 'kc_2', source_id: 'src_b', source: { id: 'src_b', title: 'Linear Algebra', domain: null } },
]

const SAMPLE_ATTEMPTS = [
  { kc_id: 'kc_1', started_at: '2026-01-28T10:00:00Z' },
  { kc_id: 'kc_2', started_at: '2026-01-28T14:00:00Z' },
  { kc_id: 'kc_1', started_at: '2026-01-27T08:00:00Z' },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('useContributionData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function setupMocks({ attempts = [], kcs = [], attemptsError = null, kcsError = null } = {}) {
    const attemptsChain = mockAttemptsChain(attempts, attemptsError)
    const kcsChain = mockKcsChain(kcs, kcsError)

    mockFrom.mockImplementation((table) => {
      if (table === 'attempts') return attemptsChain
      if (table === 'knowledge_components') return kcsChain
      return { select: vi.fn(() => Promise.resolve({ data: [], error: null })) }
    })

    return { attemptsChain, kcsChain }
  }

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  it('returns loading: true initially', () => {
    setupMocks()
    const { result } = renderHook(() => useContributionData())
    expect(result.current.loading).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Successful fetch
  // -----------------------------------------------------------------------
  it('returns gridData array after fetch completes', async () => {
    setupMocks({ attempts: SAMPLE_ATTEMPTS, kcs: SAMPLE_KCS })

    const { result } = renderHook(() => useContributionData({ weeks: 12 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeNull()
    expect(Array.isArray(result.current.gridData)).toBe(true)
    expect(result.current.gridData).toHaveLength(12)
    // Each week should have 7 days
    result.current.gridData.forEach(week => {
      expect(week).toHaveLength(7)
    })
  })

  it('computes totalAttempts and activeDays from data', async () => {
    setupMocks({ attempts: SAMPLE_ATTEMPTS, kcs: SAMPLE_KCS })

    const { result } = renderHook(() => useContributionData({ weeks: 26 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // 3 attempts across 2 days
    expect(result.current.totalAttempts).toBe(3)
    expect(result.current.activeDays).toBe(2)
  })

  it('returns unique sources list', async () => {
    setupMocks({ attempts: SAMPLE_ATTEMPTS, kcs: SAMPLE_KCS })

    const { result } = renderHook(() => useContributionData({ weeks: 26 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.sources).toHaveLength(2)
    const sourceIds = result.current.sources.map(s => s.id)
    expect(sourceIds).toContain('src_a')
    expect(sourceIds).toContain('src_b')
    // Each source should have title and hue
    result.current.sources.forEach(s => {
      expect(s.title).toBeTruthy()
      expect(typeof s.hue).toBe('number')
    })
  })

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------
  it('handles Supabase error gracefully', async () => {
    setupMocks({ attemptsError: { message: 'Network error' } })

    const { result } = renderHook(() => useContributionData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network error')
    expect(result.current.gridData).toEqual([])
    expect(result.current.totalAttempts).toBe(0)
    expect(result.current.activeDays).toBe(0)
  })

  // -----------------------------------------------------------------------
  // weeks parameter
  // -----------------------------------------------------------------------
  it('respects weeks parameter (grid length matches)', async () => {
    setupMocks({ attempts: [], kcs: [] })

    const { result: result52 } = renderHook(() => useContributionData({ weeks: 52 }))
    await waitFor(() => expect(result52.current.loading).toBe(false))
    expect(result52.current.gridData).toHaveLength(52)

    const { result: result12 } = renderHook(() => useContributionData({ weeks: 12 }))
    await waitFor(() => expect(result12.current.loading).toBe(false))
    expect(result12.current.gridData).toHaveLength(12)
  })

  // -----------------------------------------------------------------------
  // sourceFilter parameter
  // -----------------------------------------------------------------------
  it('respects sourceFilter parameter (filters attempts)', async () => {
    setupMocks({ attempts: SAMPLE_ATTEMPTS, kcs: SAMPLE_KCS })

    const { result } = renderHook(() =>
      useContributionData({ weeks: 26, sourceFilter: 'src_a' })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Only src_a attempts: kc_1 on Jan 28 and kc_1 on Jan 27 = 2 attempts
    expect(result.current.totalAttempts).toBe(2)
    expect(result.current.activeDays).toBe(2)
  })

  // -----------------------------------------------------------------------
  // refresh()
  // -----------------------------------------------------------------------
  it('refresh() triggers re-fetch', async () => {
    setupMocks({ attempts: [], kcs: [] })

    const { result } = renderHook(() => useContributionData({ weeks: 12 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Initial fetch = 1 call
    const initialCallCount = mockFrom.mock.calls.length

    // Refresh
    act(() => {
      result.current.refresh()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Should have made additional calls
    expect(mockFrom.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  // -----------------------------------------------------------------------
  // Cache behavior
  // -----------------------------------------------------------------------
  it('uses cache on subsequent renders with same params', async () => {
    setupMocks({ attempts: SAMPLE_ATTEMPTS, kcs: SAMPLE_KCS })

    const { result, rerender } = renderHook(() =>
      useContributionData({ weeks: 26 })
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const callCountAfterFirst = mockFrom.mock.calls.length

    // Re-render with same params — should use cache
    rerender()

    // Should NOT have made additional Supabase calls
    expect(mockFrom.mock.calls.length).toBe(callCountAfterFirst)
    expect(result.current.totalAttempts).toBe(3)
  })

  // -----------------------------------------------------------------------
  // Empty data
  // -----------------------------------------------------------------------
  it('handles empty attempts gracefully', async () => {
    setupMocks({ attempts: [], kcs: SAMPLE_KCS })

    const { result } = renderHook(() => useContributionData({ weeks: 26 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.totalAttempts).toBe(0)
    expect(result.current.activeDays).toBe(0)
    expect(result.current.gridData).toHaveLength(26)
    // All cells should have count 0
    const allCounts = result.current.gridData.flat().map(c => c.count)
    expect(allCounts.every(c => c === 0)).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Grid cells have expected shape
  // -----------------------------------------------------------------------
  it('enriched grid cells have required properties', async () => {
    setupMocks({ attempts: SAMPLE_ATTEMPTS, kcs: SAMPLE_KCS })

    const { result } = renderHook(() => useContributionData({ weeks: 12 }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    const cell = result.current.gridData[0][0]
    expect(cell).toHaveProperty('date')
    expect(cell).toHaveProperty('dayOfWeek')
    expect(cell).toHaveProperty('isToday')
    expect(cell).toHaveProperty('isFuture')
    expect(cell).toHaveProperty('count')
    expect(cell).toHaveProperty('bySource')
    expect(cell).toHaveProperty('color')
  })
})
