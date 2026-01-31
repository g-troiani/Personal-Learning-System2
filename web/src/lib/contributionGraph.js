/**
 * Pure utility functions for the Learning Contribution Graph.
 * No React imports — only data transformation logic.
 *
 * Data pipeline:
 *   Supabase raw attempts → aggregateAttempts() → generateDateGrid() + merge → resolveCellColor()
 */

// 10-hue palette avoiding existing semantic colors (emerald, amber, red, blue)
const SOURCE_HUES = [270, 175, 340, 235, 25, 195, 310, 90, 10, 215]

// Intensity levels: S/L values per level (level 0 uses flat gray)
const INTENSITY_LEVELS = [
  null,                    // level 0: use EMPTY_COLOR
  { s: 55, l: 82 },       // level 1: 1-3 attempts
  { s: 65, l: 62 },       // level 2: 4-7 attempts
  { s: 75, l: 42 },       // level 3: 8+ attempts
]

const EMPTY_COLOR = '#EBEDF0'

/**
 * Generate a weeks×7 grid of date cells, Monday-aligned.
 * Weeks as columns (left=oldest, right=recent), days as rows (top=Mon, bottom=Sun).
 *
 * @param {number} weeks - Number of weeks to display (12, 26, or 52)
 * @returns {Array<Array<{date: string, dayOfWeek: number, isToday: boolean, isFuture: boolean}>>}
 *   Outer array = weeks (columns), inner array = 7 days (rows, 0=Mon..6=Sun)
 */
export function generateDateGrid(weeks = 52) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the most recent Sunday (end of current week)
  // dayOfWeek: JS 0=Sun,1=Mon..6=Sat → we want Mon=0..Sun=6
  const jsDow = today.getDay() // 0=Sun..6=Sat
  const mondayOffset = jsDow === 0 ? 6 : jsDow - 1 // days since Monday

  // Start date: go back (weeks - 1) full weeks from the Monday of the current week
  const currentMonday = new Date(today)
  currentMonday.setDate(today.getDate() - mondayOffset)

  const startDate = new Date(currentMonday)
  startDate.setDate(currentMonday.getDate() - (weeks - 1) * 7)

  const grid = []
  const todayStr = today.toLocaleDateString('en-CA')

  for (let w = 0; w < weeks; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate)
      cellDate.setDate(startDate.getDate() + w * 7 + d)
      const dateStr = cellDate.toLocaleDateString('en-CA')

      week.push({
        date: dateStr,
        dayOfWeek: d, // 0=Mon..6=Sun
        isToday: dateStr === todayStr,
        isFuture: cellDate > today,
      })
    }
    grid.push(week)
  }

  return grid
}

/**
 * Map attempt count to intensity level 0-3.
 * Absolute thresholds: 0→0, 1-5→1, 6-14→2, 15+→3.
 *
 * @param {number} count
 * @returns {number} 0-3
 */
export function getIntensityLevel(count) {
  if (count <= 0) return 0
  if (count <= 5) return 1
  if (count <= 14) return 2
  return 3
}

/**
 * Deterministic hue from source ID using djb2 hash × golden angle.
 * Stable across source additions/deletions.
 *
 * @param {string} sourceId
 * @returns {number} Hue index (0-9) into SOURCE_HUES palette
 */
export function getSourceHue(sourceId) {
  if (!sourceId) return SOURCE_HUES[0]

  // djb2 hash
  let hash = 5381
  for (let i = 0; i < sourceId.length; i++) {
    hash = ((hash << 5) + hash + sourceId.charCodeAt(i)) & 0xffffffff
  }

  // Golden angle distribution then map to palette index
  const angle = (Math.abs(hash) * 137.508) % 360
  const index = Math.round(angle / 36) % SOURCE_HUES.length
  return SOURCE_HUES[index]
}

/**
 * Returns HSL color string for a given hue and intensity level.
 *
 * @param {number} hue - HSL hue value (0-360)
 * @param {number} level - Intensity level 0-3
 * @returns {string} CSS color string (hex for level 0, hsl() for levels 1-3)
 */
export function getSourceColor(hue, level) {
  if (level <= 0) return EMPTY_COLOR
  const clamped = Math.min(level, 3)
  const { s, l } = INTENSITY_LEVELS[clamped]
  return `hsl(${hue}, ${s}%, ${l}%)`
}

/**
 * Resolve the display color for a single grid cell.
 * Dominant source (most attempts) wins. Intensity based on total count.
 *
 * @param {{ total: number, bySource: Object<string, number> }} dayData
 * @param {Object<string, number>} sourceHueMap - sourceId → hue value
 * @returns {{ color: string, dominantSourceId: string|null, isMultiSource: boolean }}
 */
export function resolveCellColor(dayData, sourceHueMap) {
  if (!dayData || dayData.total <= 0) {
    return { color: EMPTY_COLOR, dominantSourceId: null, isMultiSource: false }
  }

  const entries = Object.entries(dayData.bySource || {})
  if (entries.length === 0) {
    // Has total but no source breakdown — use default hue
    const level = getIntensityLevel(dayData.total)
    return { color: getSourceColor(SOURCE_HUES[0], level), dominantSourceId: null, isMultiSource: false }
  }

  // Find dominant source (highest count)
  let dominantId = entries[0][0]
  let maxCount = entries[0][1]
  for (let i = 1; i < entries.length; i++) {
    if (entries[i][1] > maxCount) {
      maxCount = entries[i][1]
      dominantId = entries[i][0]
    }
  }

  const hue = sourceHueMap[dominantId] ?? SOURCE_HUES[0]
  const level = getIntensityLevel(dayData.total)
  const color = getSourceColor(hue, level)

  return {
    color,
    dominantSourceId: dominantId,
    isMultiSource: entries.length > 1,
  }
}

/**
 * Group raw attempts by local date and source.
 * Uses toLocaleDateString('en-CA') for YYYY-MM-DD in user's timezone.
 *
 * @param {Array<{started_at: string, kc_id: string}>} attempts
 * @param {Object<string, {sourceId: string, sourceTitle: string}>} kcSourceMap - kc_id → source info
 * @returns {Map<string, {total: number, bySource: Object<string, number>}>}
 */
export function aggregateAttempts(attempts, kcSourceMap) {
  const dateMap = new Map()

  if (!attempts || !Array.isArray(attempts)) return dateMap

  for (const attempt of attempts) {
    const dateKey = parseAttemptDate(attempt.started_at)
    if (!dateKey) continue

    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { total: 0, bySource: {} })
    }

    const entry = dateMap.get(dateKey)
    entry.total++

    // Resolve source from KC
    const kcInfo = kcSourceMap?.[attempt.kc_id]
    const sourceId = kcInfo?.sourceId || 'unknown'
    entry.bySource[sourceId] = (entry.bySource[sourceId] || 0) + 1
  }

  return dateMap
}

/**
 * Parse an attempt timestamp to a local YYYY-MM-DD date string.
 * Returns null for unparseable values.
 *
 * @param {string} startedAt - ISO 8601 timestamp
 * @returns {string|null} 'YYYY-MM-DD' in user's local timezone, or null
 */
export function parseAttemptDate(startedAt) {
  if (!startedAt) return null
  const date = new Date(startedAt)
  if (isNaN(date.getTime())) return null
  return date.toLocaleDateString('en-CA')
}

/**
 * Compute summary statistics from aggregated date map.
 *
 * @param {Map<string, {total: number, bySource: Object}>} dateMap
 * @returns {{ totalAttempts: number, activeDays: number, mostActiveDay: string|null, mostActiveCount: number }}
 */
export function computeSummary(dateMap) {
  let totalAttempts = 0
  let activeDays = 0
  let mostActiveDay = null
  let mostActiveCount = 0

  for (const [dateKey, data] of dateMap) {
    if (data.total > 0) {
      totalAttempts += data.total
      activeDays++
      if (data.total > mostActiveCount) {
        mostActiveCount = data.total
        mostActiveDay = dateKey
      }
    }
  }

  return { totalAttempts, activeDays, mostActiveDay, mostActiveCount }
}

// Re-export constants for use in components
export { SOURCE_HUES, EMPTY_COLOR }
