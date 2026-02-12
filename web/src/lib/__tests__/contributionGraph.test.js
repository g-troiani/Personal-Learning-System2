import { describe, it, expect } from 'vitest'
import {
  generateDateGrid,
  getIntensityLevel,
  getSourceHue,
  getSourceColor,
  resolveCellColor,
  aggregateAttempts,
  parseAttemptDate,
  computeSummary,
  SOURCE_HUES,
  EMPTY_COLOR,
} from '../contributionGraph'

// ============================================================================
// generateDateGrid
// ============================================================================
describe('generateDateGrid', () => {
  it('returns exactly N arrays of 7 cells each', () => {
    const grid52 = generateDateGrid(52)
    expect(grid52).toHaveLength(52)
    grid52.forEach(week => expect(week).toHaveLength(7))

    const grid26 = generateDateGrid(26)
    expect(grid26).toHaveLength(26)
    grid26.forEach(week => expect(week).toHaveLength(7))

    const grid12 = generateDateGrid(12)
    expect(grid12).toHaveLength(12)
  })

  it('first cell of every week is Monday (dayOfWeek=0)', () => {
    const grid = generateDateGrid(52)
    grid.forEach(week => {
      expect(week[0].dayOfWeek).toBe(0)
    })
  })

  it('last cell of every week is Sunday (dayOfWeek=6)', () => {
    const grid = generateDateGrid(52)
    grid.forEach(week => {
      expect(week[6].dayOfWeek).toBe(6)
    })
  })

  it('cells have valid YYYY-MM-DD date strings', () => {
    const grid = generateDateGrid(4)
    grid.forEach(week => {
      week.forEach(cell => {
        expect(cell.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  })

  it('dates are consecutive across weeks', () => {
    const grid = generateDateGrid(4)
    const allDates = grid.flat().map(c => c.date)
    for (let i = 1; i < allDates.length; i++) {
      const prev = new Date(allDates[i - 1])
      const curr = new Date(allDates[i])
      const diffMs = curr - prev
      expect(diffMs).toBe(24 * 60 * 60 * 1000) // exactly 1 day apart
    }
  })

  it('marks exactly one cell as isToday', () => {
    const grid = generateDateGrid(52)
    const todayCells = grid.flat().filter(c => c.isToday)
    expect(todayCells).toHaveLength(1)
    const todayStr = new Date().toLocaleDateString('en-CA')
    expect(todayCells[0].date).toBe(todayStr)
  })

  it('future cells are marked isFuture', () => {
    const grid = generateDateGrid(52)
    const allCells = grid.flat()
    const todayIdx = allCells.findIndex(c => c.isToday)

    // Cells after today should be future
    for (let i = todayIdx + 1; i < allCells.length; i++) {
      expect(allCells[i].isFuture).toBe(true)
    }
  })

  it('the current week contains today', () => {
    const grid = generateDateGrid(52)
    const lastWeek = grid[grid.length - 1]
    const hasToday = lastWeek.some(c => c.isToday)
    // Today should be in the last week (most recent)
    expect(hasToday).toBe(true)
  })
})

// ============================================================================
// getIntensityLevel
// ============================================================================
describe('getIntensityLevel', () => {
  it('returns 0 for count=0', () => {
    expect(getIntensityLevel(0)).toBe(0)
  })

  it('returns 0 for negative counts', () => {
    expect(getIntensityLevel(-1)).toBe(0)
    expect(getIntensityLevel(-100)).toBe(0)
  })

  it('returns 1 for counts 1-5', () => {
    expect(getIntensityLevel(1)).toBe(1)
    expect(getIntensityLevel(3)).toBe(1)
    expect(getIntensityLevel(5)).toBe(1)
  })

  it('returns 2 for counts 6-14', () => {
    expect(getIntensityLevel(6)).toBe(2)
    expect(getIntensityLevel(10)).toBe(2)
    expect(getIntensityLevel(14)).toBe(2)
  })

  it('returns 3 for counts 15+', () => {
    expect(getIntensityLevel(15)).toBe(3)
    expect(getIntensityLevel(20)).toBe(3)
    expect(getIntensityLevel(100)).toBe(3)
    expect(getIntensityLevel(9999)).toBe(3)
  })
})

// ============================================================================
// getSourceHue
// ============================================================================
describe('getSourceHue', () => {
  it('returns same hue for same sourceId across calls', () => {
    const hue1 = getSourceHue('src_abc123')
    const hue2 = getSourceHue('src_abc123')
    const hue3 = getSourceHue('src_abc123')
    expect(hue1).toBe(hue2)
    expect(hue2).toBe(hue3)
  })

  it('returns different hues for different sourceIds', () => {
    const hues = new Set()
    const ids = ['src_aaa', 'src_bbb', 'src_ccc', 'src_ddd', 'src_eee']
    ids.forEach(id => hues.add(getSourceHue(id)))
    // With 5 different IDs, we should get at least 2 different hues
    expect(hues.size).toBeGreaterThanOrEqual(2)
  })

  it('returns a value from the SOURCE_HUES palette', () => {
    const testIds = ['src_1', 'src_2', 'src_xyz', 'kc_abc', 'foo_bar']
    testIds.forEach(id => {
      const hue = getSourceHue(id)
      expect(SOURCE_HUES).toContain(hue)
    })
  })

  it('handles null/undefined sourceId gracefully', () => {
    expect(getSourceHue(null)).toBe(SOURCE_HUES[0])
    expect(getSourceHue(undefined)).toBe(SOURCE_HUES[0])
    expect(getSourceHue('')).toBe(SOURCE_HUES[0])
  })
})

// ============================================================================
// getSourceColor
// ============================================================================
describe('getSourceColor', () => {
  it('returns EMPTY_COLOR for level 0', () => {
    expect(getSourceColor(270, 0)).toBe(EMPTY_COLOR)
  })

  it('returns EMPTY_COLOR for negative levels', () => {
    expect(getSourceColor(270, -1)).toBe(EMPTY_COLOR)
  })

  it('returns HSL string for level 1', () => {
    const color = getSourceColor(270, 1)
    expect(color).toBe('hsl(270, 55%, 82%)')
  })

  it('returns HSL string for level 2', () => {
    const color = getSourceColor(175, 2)
    expect(color).toBe('hsl(175, 65%, 62%)')
  })

  it('returns HSL string for level 3', () => {
    const color = getSourceColor(340, 3)
    expect(color).toBe('hsl(340, 75%, 42%)')
  })

  it('clamps levels above 3 to level 3', () => {
    const color = getSourceColor(270, 5)
    expect(color).toBe('hsl(270, 75%, 42%)')
  })
})

// ============================================================================
// resolveCellColor
// ============================================================================
describe('resolveCellColor', () => {
  const sourceHueMap = {
    src_a: 270,
    src_b: 175,
    src_c: 340,
  }

  it('returns EMPTY_COLOR for null/zero data', () => {
    expect(resolveCellColor(null, sourceHueMap).color).toBe(EMPTY_COLOR)
    expect(resolveCellColor({ total: 0, bySource: {} }, sourceHueMap).color).toBe(EMPTY_COLOR)
  })

  it('picks source with highest count as dominant', () => {
    const dayData = {
      total: 10,
      bySource: { src_a: 3, src_b: 7 }
    }
    const result = resolveCellColor(dayData, sourceHueMap)
    expect(result.dominantSourceId).toBe('src_b')
  })

  it('uses total count for intensity level', () => {
    const dayData = {
      total: 10, // level 2 (6-14)
      bySource: { src_a: 10 }
    }
    const result = resolveCellColor(dayData, sourceHueMap)
    expect(result.color).toBe('hsl(270, 65%, 62%)')
  })

  it('sets isMultiSource=true when 2+ sources present', () => {
    const multiSource = {
      total: 5,
      bySource: { src_a: 3, src_b: 2 }
    }
    expect(resolveCellColor(multiSource, sourceHueMap).isMultiSource).toBe(true)

    const singleSource = {
      total: 5,
      bySource: { src_a: 5 }
    }
    expect(resolveCellColor(singleSource, sourceHueMap).isMultiSource).toBe(false)
  })

  it('handles unknown source gracefully', () => {
    const dayData = {
      total: 3,
      bySource: { unknown_src: 3 }
    }
    const result = resolveCellColor(dayData, sourceHueMap)
    expect(result.color).not.toBe(EMPTY_COLOR) // should still produce a color
    expect(result.dominantSourceId).toBe('unknown_src')
  })
})

// ============================================================================
// parseAttemptDate
// ============================================================================
describe('parseAttemptDate', () => {
  it('returns YYYY-MM-DD for valid ISO timestamp', () => {
    const result = parseAttemptDate('2026-01-28T15:30:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns null for null/undefined', () => {
    expect(parseAttemptDate(null)).toBeNull()
    expect(parseAttemptDate(undefined)).toBeNull()
    expect(parseAttemptDate('')).toBeNull()
  })

  it('returns null for unparseable strings', () => {
    expect(parseAttemptDate('not-a-date')).toBeNull()
    expect(parseAttemptDate('foobar')).toBeNull()
  })

  it('converts UTC timestamp to local date', () => {
    // This test verifies that toLocaleDateString is used (local timezone)
    // The exact result depends on the test runner's timezone,
    // but it should always produce a valid date
    const result = parseAttemptDate('2026-06-15T12:00:00Z')
    expect(result).toMatch(/^2026-06-1[45]$/) // could be 14 or 15 depending on TZ
  })
})

// ============================================================================
// aggregateAttempts
// ============================================================================
describe('aggregateAttempts', () => {
  const kcSourceMap = {
    kc_1: { sourceId: 'src_a', sourceTitle: 'Cognitive Science' },
    kc_2: { sourceId: 'src_b', sourceTitle: 'Linear Algebra' },
    kc_3: { sourceId: 'src_a', sourceTitle: 'Cognitive Science' },
  }

  it('returns empty map for empty array', () => {
    const result = aggregateAttempts([], kcSourceMap)
    expect(result.size).toBe(0)
  })

  it('returns empty map for null/undefined', () => {
    expect(aggregateAttempts(null, kcSourceMap).size).toBe(0)
    expect(aggregateAttempts(undefined, kcSourceMap).size).toBe(0)
  })

  it('groups multiple attempts on same date correctly', () => {
    const attempts = [
      { started_at: '2026-01-28T10:00:00Z', kc_id: 'kc_1' },
      { started_at: '2026-01-28T14:00:00Z', kc_id: 'kc_2' },
      { started_at: '2026-01-28T18:00:00Z', kc_id: 'kc_1' },
    ]
    const result = aggregateAttempts(attempts, kcSourceMap)

    // All three should be on the same date (Jan 28 in most timezones)
    const dateKey = parseAttemptDate('2026-01-28T10:00:00Z')
    const dayData = result.get(dateKey)
    expect(dayData).toBeDefined()
    expect(dayData.total).toBe(3)
  })

  it('separates attempts on different dates', () => {
    const attempts = [
      { started_at: '2026-01-27T12:00:00Z', kc_id: 'kc_1' },
      { started_at: '2026-01-28T12:00:00Z', kc_id: 'kc_1' },
    ]
    const result = aggregateAttempts(attempts, kcSourceMap)
    expect(result.size).toBe(2)
  })

  it('tracks per-source breakdown', () => {
    const attempts = [
      { started_at: '2026-01-28T10:00:00Z', kc_id: 'kc_1' }, // src_a
      { started_at: '2026-01-28T11:00:00Z', kc_id: 'kc_2' }, // src_b
      { started_at: '2026-01-28T12:00:00Z', kc_id: 'kc_3' }, // src_a
    ]
    const result = aggregateAttempts(attempts, kcSourceMap)
    const dateKey = parseAttemptDate('2026-01-28T10:00:00Z')
    const dayData = result.get(dateKey)
    expect(dayData.bySource.src_a).toBe(2)
    expect(dayData.bySource.src_b).toBe(1)
  })

  it('handles null kc_id gracefully (buckets under "unknown")', () => {
    const attempts = [
      { started_at: '2026-01-28T10:00:00Z', kc_id: null },
      { started_at: '2026-01-28T11:00:00Z', kc_id: 'nonexistent_kc' },
    ]
    const result = aggregateAttempts(attempts, kcSourceMap)
    const dateKey = parseAttemptDate('2026-01-28T10:00:00Z')
    const dayData = result.get(dateKey)
    expect(dayData.total).toBe(2)
    expect(dayData.bySource.unknown).toBe(2)
  })

  it('skips attempts with unparseable dates', () => {
    const attempts = [
      { started_at: 'invalid-date', kc_id: 'kc_1' },
      { started_at: '2026-01-28T10:00:00Z', kc_id: 'kc_1' },
    ]
    const result = aggregateAttempts(attempts, kcSourceMap)
    // Only the valid one should be counted
    expect(result.size).toBe(1)
  })
})

// ============================================================================
// computeSummary
// ============================================================================
describe('computeSummary', () => {
  it('returns zeros for empty map', () => {
    const result = computeSummary(new Map())
    expect(result.totalAttempts).toBe(0)
    expect(result.activeDays).toBe(0)
    expect(result.mostActiveDay).toBeNull()
    expect(result.mostActiveCount).toBe(0)
  })

  it('computes correct totals', () => {
    const dateMap = new Map([
      ['2026-01-27', { total: 5, bySource: {} }],
      ['2026-01-28', { total: 10, bySource: {} }],
      ['2026-01-29', { total: 0, bySource: {} }],
    ])
    const result = computeSummary(dateMap)
    expect(result.totalAttempts).toBe(15)
    expect(result.activeDays).toBe(2)
    expect(result.mostActiveDay).toBe('2026-01-28')
    expect(result.mostActiveCount).toBe(10)
  })

  it('identifies most active day correctly', () => {
    const dateMap = new Map([
      ['2026-01-25', { total: 3, bySource: {} }],
      ['2026-01-26', { total: 12, bySource: {} }],
      ['2026-01-27', { total: 8, bySource: {} }],
    ])
    const result = computeSummary(dateMap)
    expect(result.mostActiveDay).toBe('2026-01-26')
    expect(result.mostActiveCount).toBe(12)
  })
})
