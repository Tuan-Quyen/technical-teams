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

// QA (M2): one full cycle through the real UI tick: AC8, AC9, AC10, AC13 end to end.
describe('QA: full 4-session cycle through the UI', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(T0)
    const settings = { ...DEFAULT_SETTINGS, focusMin: 1, shortMin: 1, longMin: 1 }
    useTimerStore.setState({
      settings,
      timer: initialTimer(settings),
      lastEnd: null,
      lastTransitionAt: 0,
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Focus x4 with Short Breaks, then Long Break 4/4, then Focus 0/4 (Auto-start on)', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    for (const done of [1, 2, 3]) {
      advance(MIN)
      expect(screen.getByText('Short Break', { selector: 'p' })).toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: `${String(done)} of 4 focus sessions completed` }),
      ).toBeVisible()
      advance(MIN)
      expect(screen.getByRole('timer')).toHaveTextContent('01:00')
    }
    advance(MIN)
    expect(screen.getByText('Long Break', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '4 of 4 focus sessions completed' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    advance(MIN)
    expect(screen.getByText('Focus', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '0 of 4 focus sessions completed' })).toBeVisible()
    expect(useTimerStore.getState().timer.completed).toBe(0)
  })

  it('a clock jump far past the end ends the phase once, not several times (E1, E3)', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await u.click(screen.getByRole('button', { name: 'Start' }))
    vi.setSystemTime(T0 + 30 * MIN)
    advance(500)
    expect(useTimerStore.getState().timer.completed).toBe(1)
    expect(useTimerStore.getState().timer.phase).toBe('short')
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })
})
