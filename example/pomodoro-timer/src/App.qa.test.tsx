import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { DEFAULT_SETTINGS } from './domain/settings.ts'
import { initialTimer } from './domain/timer.ts'
import { useTimerStore } from './store/timerStore.ts'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// QA additions (POMO-M1): keyboard operation (POMO-AC24 base), POMO-E3 in the UI, 44 px target class (POMO-AC22).
describe('QA: App keyboard and rapid clicks', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(T0)
    useTimerStore.setState({
      settings: DEFAULT_SETTINGS,
      timer: initialTimer(DEFAULT_SETTINGS),
      lastEnd: null,
      lastTransitionAt: 0,
    })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('Tab reaches the primary button; Enter starts, Space pauses, Enter resumes', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    // Header (Enter focus mode, Open settings) and Reset come first in tab order.
    await u.tab()
    await u.tab()
    await u.tab()
    await u.tab()
    expect(screen.getByRole('button', { name: 'Start' })).toHaveFocus()
    await u.keyboard('{Enter}')
    advance(1000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')
    await u.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Resume' })).toHaveFocus()
    advance(5000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')
    await u.keyboard('{Enter}')
    advance(1000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:58')
  })

  it('Space / R / S / F on the body trigger nothing (POMO-AC24)', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await u.keyboard(' rsf')
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  })

  it('double-click Start yields one start, the second click pauses (POMO-E3)', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<App />)
    await u.dblClick(screen.getByRole('button', { name: 'Start' }))
    expect(useTimerStore.getState().timer.phaseId).toBe(0)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  })

  it('primary button is at least 44 px by class (POMO-AC22)', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Start' }).className).toMatch(/min-h-1[2-9]/)
  })
})
