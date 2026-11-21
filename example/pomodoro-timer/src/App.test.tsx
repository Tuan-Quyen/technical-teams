import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { DEFAULT_SETTINGS } from './domain/settings.ts'
import { initialTimer } from './domain/timer.ts'
import { useTimerStore } from './store/timerStore.ts'

const MIN = 60_000
const T0 = new Date('2026-01-01T10:00:00Z').getTime()

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function resetStore(over: Partial<typeof DEFAULT_SETTINGS> = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...over }
  useTimerStore.setState({
    settings,
    timer: initialTimer(settings),
    lastEnd: null,
    lastTransitionAt: 0,
  })
}

// setTimeout stays real: the Testing Library async wrapper waits on it.
function useFakeClock() {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(T0)
}

/** Name of the phase tab marked as current. */
function activePhase() {
  return screen.getByRole('list', { name: 'Phase' }).querySelector('[aria-current="step"]')
    ?.textContent
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

describe('App timer slice (POMO-AC1-POMO-AC4)', () => {
  beforeEach(() => {
    useFakeClock()
    resetStore()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows Focus 25:00 idle with a Start button on load (POMO-AC1)', () => {
    render(<App />)
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
    expect(activePhase()).toBe('Focus')
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('Start counts down, Pause freezes, Resume continues (POMO-AC2-POMO-AC4)', async () => {
    const u = user()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()

    advance(1000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')

    await u.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
    advance(10_000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')

    await u.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')
    advance(2000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:57')
    expect(screen.queryByText('Paused')).not.toBeInTheDocument()
  })

  it('flips digits on time when the start is not tick-aligned (POMO-R1)', async () => {
    vi.setSystemTime(T0 + 17)
    const u = user()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    advance(1000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')
    advance(1000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:58')
  })

  it('paints no stale frame right after Resume, even after a long pause', async () => {
    const u = user()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    advance(10 * MIN)
    await u.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('timer')).toHaveTextContent('15:00')
    vi.setSystemTime(Date.now() + 30 * MIN)
    await u.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('timer')).toHaveTextContent('15:00')
  })

  it('derives the display from timestamps: a clock jump is reflected', async () => {
    const u = user()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(T0 + MIN)
    advance(250)
    expect(screen.getByRole('timer')).toHaveTextContent('24:00')
  })
})

describe('phase end through the tick (POMO-AC8-POMO-AC10)', () => {
  beforeEach(() => {
    useFakeClock()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Auto-start on: Focus reaches 00:00 and Short Break runs from 05:00', async () => {
    resetStore({ autoStart: true })
    const u = user()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    advance(25 * MIN)
    expect(activePhase()).toBe('Short Break')
    expect(screen.getByRole('timer')).toHaveTextContent('05:00')
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(useTimerStore.getState().timer.completed).toBe(1)
    advance(1000)
    expect(screen.getByRole('timer')).toHaveTextContent('04:59')
  })

  it('Auto-start off: next phase waits idle with a finished caption', async () => {
    resetStore({ autoStart: false })
    const u = user()
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    advance(25 * MIN)
    expect(activePhase()).toBe('Short Break')
    expect(screen.getByRole('timer')).toHaveTextContent('05:00')
    expect(screen.getByText('Focus finished')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    advance(10_000)
    expect(screen.getByRole('timer')).toHaveTextContent('05:00')
  })
})
