import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { DEFAULT_SETTINGS } from './domain/settings.ts'
import { initialTimer } from './domain/timer.ts'
import { useTimerStore } from './store/timerStore.ts'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()
const MIN = 60_000
const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
const button = (name: string) => screen.getByRole('button', { name })
const region = () => screen.getByRole('status')

function resetStore() {
  useTimerStore.setState({
    settings: DEFAULT_SETTINGS,
    timer: initialTimer(DEFAULT_SETTINGS),
    lastEnd: null,
    lastTransitionAt: 0,
    notifyAsked: true,
  })
}

describe('polish: title and live region (POMO-E12, POMO-AC24)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(T0)
    resetStore()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('title is "Pomodoro" idle and "MM:SS · Focus — Pomodoro" while running or paused', async () => {
    const u = user()
    render(<App />)
    expect(document.title).toBe('Pomodoro')
    await u.click(button('Start'))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(document.title).toBe('24:55 · Focus — Pomodoro')
    await u.click(button('Pause'))
    expect(document.title).toBe('24:55 · Focus — Pomodoro')
    await u.click(button('Reset timer'))
    expect(document.title).toBe('Pomodoro')
  })

  it('has exactly one role="status" region, polite, visually hidden', () => {
    render(<App />)
    const regions = screen.getAllByRole('status')
    expect(regions).toHaveLength(1)
    expect(regions[0]).toHaveAttribute('aria-live', 'polite')
    expect(regions[0]).toHaveClass('sr-only')
  })

  it('announces state changes with the spec copy and never the per-second digits', async () => {
    const u = user()
    render(<App />)
    expect(region()).toHaveTextContent('')
    await u.click(button('Start'))
    expect(region()).toHaveTextContent('Focus started, 25 minutes')
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(region()).toHaveTextContent('Focus started, 25 minutes')
    await u.click(button('Pause'))
    expect(region()).toHaveTextContent('Paused at 24:57')
    await u.click(button('Resume'))
    expect(region()).toHaveTextContent('Resumed')
    await u.click(button('Reset timer'))
    expect(region()).toHaveTextContent('Focus reset to 25:00')
    vi.setSystemTime(Date.now() + 1000)
    await u.click(button('Skip to next phase'))
    expect(region()).toHaveTextContent('Skipped to Short Break — started')
  })

  it('announces a natural phase end', async () => {
    const u = user()
    render(<App />)
    await u.click(button('Start'))
    act(() => {
      vi.advanceTimersByTime(25 * MIN)
    })
    expect(region()).toHaveTextContent('Focus finished. Short Break started.')
  })

  it('announces "Settings saved" after Save, once the dialog is gone', async () => {
    const u = user()
    render(<App />)
    await u.click(button('Open settings'))
    await u.click(button('Save'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(region()).toHaveTextContent('Settings saved')
  })

  it.each([
    ['granted', 'Notifications allowed'],
    ['denied', 'Notifications blocked. Sound alerts still work.'],
  ] as const)('announces the Allow notifications result %s', async (result, text) => {
    const u = user()
    // The app reads the answer back from `Notification.permission`, as a browser would.
    const fake = {
      permission: 'default' as NotificationPermission,
      requestPermission: vi.fn(() => {
        fake.permission = result
        return Promise.resolve(result)
      }),
    }
    vi.stubGlobal('Notification', fake)
    useTimerStore.setState({ notifyAsked: false })
    render(<App />)
    await u.click(button('Open settings'))
    await u.click(button('Allow notifications'))
    await waitFor(() => {
      expect(region()).toHaveTextContent(text)
    })
  })

  it('Space / R / S / F on the body do nothing and nothing is announced', async () => {
    const u = user()
    render(<App />)
    await u.keyboard(' rsf')
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
    expect(region()).toHaveTextContent('')
  })
})
