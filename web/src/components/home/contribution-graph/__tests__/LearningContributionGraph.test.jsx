import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the hook before importing the component
const mockHookReturn = {
  gridData: [],
  sources: [],
  loading: false,
  error: null,
  totalAttempts: 0,
  activeDays: 0,
  refresh: vi.fn(),
}

vi.mock('../../../../hooks/useContributionData', () => ({
  useContributionData: () => mockHookReturn,
}))

// Must import after mock
import LearningContributionGraph from '../LearningContributionGraph'
import { generateDateGrid, resolveCellColor, EMPTY_COLOR } from '../../../../lib/contributionGraph'

// Helper: create a fully enriched grid for testing
function makeTestGrid(weeks) {
  const grid = generateDateGrid(weeks)
  return grid.map(week =>
    week.map(cell => ({
      ...cell,
      count: 0,
      bySource: {},
      ...resolveCellColor(null, {}),
    }))
  )
}

describe('LearningContributionGraph', () => {
  it('renders without crashing with empty data', () => {
    mockHookReturn.gridData = makeTestGrid(26)
    mockHookReturn.loading = false
    mockHookReturn.error = null
    mockHookReturn.totalAttempts = 0

    const { container } = render(<LearningContributionGraph />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders 364 cells at weeks=52', () => {
    mockHookReturn.gridData = makeTestGrid(52)
    mockHookReturn.totalAttempts = 5

    const { container } = render(<LearningContributionGraph />)
    // Each DayCell has role="gridcell"
    const cells = container.querySelectorAll('[role="gridcell"]')
    expect(cells.length).toBe(52 * 7)
  })

  it('shows error fallback when hook returns error', () => {
    mockHookReturn.error = 'Network error'
    mockHookReturn.gridData = []

    render(<LearningContributionGraph />)
    expect(screen.getByText('Unable to load practice activity.')).toBeTruthy()

    // Reset
    mockHookReturn.error = null
  })

  it('shows loading state', () => {
    mockHookReturn.loading = true
    mockHookReturn.gridData = []

    const { container } = render(<LearningContributionGraph />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()

    // Reset
    mockHookReturn.loading = false
  })

  it('shows empty state message when totalAttempts is 0', () => {
    mockHookReturn.gridData = makeTestGrid(26)
    mockHookReturn.totalAttempts = 0

    render(<LearningContributionGraph />)
    expect(screen.getByText(/No practice activity yet/)).toBeTruthy()
  })

  it('renders header with Practice Activity title', () => {
    mockHookReturn.gridData = makeTestGrid(26)
    mockHookReturn.totalAttempts = 10
    mockHookReturn.activeDays = 3

    render(<LearningContributionGraph />)
    expect(screen.getByText('Practice Activity')).toBeTruthy()
    expect(screen.getByText(/10 attempts across 3 days/)).toBeTruthy()
  })
})
