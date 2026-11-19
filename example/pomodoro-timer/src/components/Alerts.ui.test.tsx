import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import * as chime from '../services/chime.ts'
import { useTimerStore } from '../store/timerStore.ts'
import { TimerDisplay } from './TimerDisplay.tsx'

const N1 =
  "Get alerts while you're in other tabs. Allow notifications now, or you'll be asked when you first press Start."
const N2 = "Notifications are off. Allow them below, or in your browser's site settings."
const N3 = 'Notifications are blocked in your browser settings. Sound alerts still work.'
const N4 = "This browser doesn't support notifications. Sound alerts still work."
const N5 =
  'Notifications are unavailable and Sound is off. Turn on Sound to be alerted when a phase ends.'
const G1 = "Notifications are on. You'll get an alert when a phase ends."

interface FakeNotification {
  permission: NotificationPermission
  requestPermission: ReturnType<typeof vi.fn>
}

let notification: FakeNotification
/** Resolve the open permission prompt with this answer. */
let answer: (p: NotificationPermission) => void

function stubNotification(permission: NotificationPermission | 'absent') {
  if (permission === 'absent') {
    vi.stubGlobal('Notification', undefined)
    return
  }
  notification = {
    permission,
    requestPermission: vi.fn(
      () =>
        new Promise<NotificationPermission>((resolve) => {
          answer = (p) => {
            notification.permission = p
            resolve(p)
          }
        }),
    ),
  }
  vi.stubGlobal('Notification', notification)
}

function resetStore(over: Partial<ReturnType<typeof useTimerStore.getState>> = {}) {
  useTimerStore.setState({
    settings: DEFAULT_SETTINGS,
    timer: initialTimer(DEFAULT_SETTINGS),
    lastEnd: null,
    lastTransitionAt: 0,
    notifyAsked: false,
    ...over,
  })
}

const user = () => userEvent.setup()
const button = (name: string) => screen.getByRole('button', { name })
const queryButton = (name: string) => screen.queryByRole('button', { name })

async function openSettings(u: ReturnType<typeof user>) {
  await u.click(button('Open settings'))
}

describe('Start and notification permission (E5, AC15)', () => {
  beforeEach(() => {
    resetStore()
    stubNotification('default')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('does not ask on load', () => {
    render(<App />)
    expect(notification.requestPermission).not.toHaveBeenCalled()
  })

  it('asks once on the first Start; the timer runs at once and the flag is set', async () => {
    const arm = vi.spyOn(chime, 'arm')
    const u = user()
    render(<App />)
    await u.click(button('Start'))
    expect(notification.requestPermission).toHaveBeenCalledTimes(1)
    // the prompt is still open, yet the timer already runs
    expect(button('Pause')).toBeInTheDocument()
    expect(useTimerStore.getState().timer.status).toBe('running')
    expect(useTimerStore.getState().notifyAsked).toBe(true)
    expect(arm).toHaveBeenCalledTimes(1)

    await u.click(button('Pause'))
    await u.click(button('Resume'))
    expect(notification.requestPermission).toHaveBeenCalledTimes(1)
    expect(arm).toHaveBeenCalledTimes(2) // audio is armed on every Start / Resume click
  })

  it('never asks again once the flag is stored, even if permission is still default', async () => {
    resetStore({ notifyAsked: true })
    const u = user()
    render(<App />)
    await u.click(button('Start'))
    expect(notification.requestPermission).not.toHaveBeenCalled()
  })

  it.each(['granted', 'denied', 'absent'] as const)(
    'does not ask when permission is %s, and Start still works',
    async (p) => {
      stubNotification(p)
      const u = user()
      render(<App />)
      await u.click(button('Start'))
      expect(button('Pause')).toBeInTheDocument()
      if (p !== 'absent') expect(notification.requestPermission).not.toHaveBeenCalled()
    },
  )
})

describe('Settings notification status (AC15, AC25)', () => {
  beforeEach(() => {
    resetStore()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('default, not yet asked: N1 and the Allow button', async () => {
    stubNotification('default')
    const u = user()
    render(<App />)
    await openSettings(u)
    expect(screen.getByText(N1)).toBeInTheDocument()
    expect(button('Allow notifications')).toBeInTheDocument()
  })

  it('default, asked: N2 and the Allow button', async () => {
    stubNotification('default')
    resetStore({ notifyAsked: true })
    const u = user()
    render(<App />)
    await openSettings(u)
    expect(screen.getByText(N2)).toBeInTheDocument()
    expect(button('Allow notifications')).toBeInTheDocument()
  })

  it('granted on open: G1 only, no button, no N text', async () => {
    stubNotification('granted')
    const u = user()
    render(<App />)
    await openSettings(u)
    expect(screen.getByText(G1)).toBeInTheDocument()
    expect(queryButton('Allow notifications')).not.toBeInTheDocument()
    expect(screen.queryByText(N1)).not.toBeInTheDocument()
  })

  it('denied: N3 with Sound on, N5 with Sound off (live from the draft), no button', async () => {
    stubNotification('denied')
    const u = user()
    render(<App />)
    await openSettings(u)
    expect(screen.getByText(N3)).toBeInTheDocument()
    expect(queryButton('Allow notifications')).not.toBeInTheDocument()
    await u.click(screen.getByRole('switch', { name: 'Sound' }))
    expect(screen.getByText(N5)).toBeInTheDocument()
    expect(screen.queryByText(N3)).not.toBeInTheDocument()
    await u.click(screen.getByRole('switch', { name: 'Sound' }))
    expect(screen.getByText(N3)).toBeInTheDocument()
  })

  it('unsupported: N4 with Sound on, N5 with Sound off, no button, no error', async () => {
    stubNotification('absent')
    const u = user()
    render(<App />)
    await openSettings(u)
    expect(screen.getByText(N4)).toBeInTheDocument()
    expect(queryButton('Allow notifications')).not.toBeInTheDocument()
    await u.click(screen.getByRole('switch', { name: 'Sound' }))
    expect(screen.getByText(N5)).toBeInTheDocument()
  })

  it('the status rows are static text: not focusable, no live role', async () => {
    stubNotification('granted')
    const u = user()
    render(<App />)
    await openSettings(u)
    const row = screen.getByText(G1).parentElement
    expect(row).not.toBeNull()
    expect(row?.matches('[tabindex], [role], [aria-live]')).toBe(false)
    expect(row?.querySelector('[tabindex], [role], [aria-live], button, a, input')).toBeNull()
  })

  describe('Allow notifications button', () => {
    beforeEach(() => {
      stubNotification('default')
    })

    it('granted: G1 replaces hint and button, focus moves to the Sound switch, flag set', async () => {
      const u = user()
      render(<App />)
      await openSettings(u)
      await u.click(button('Allow notifications'))
      expect(notification.requestPermission).toHaveBeenCalledTimes(1)
      expect(useTimerStore.getState().notifyAsked).toBe(true)
      expect(button('Allow notifications')).toHaveAttribute('aria-disabled', 'true')
      act(() => {
        answer('granted')
      })
      await waitFor(() => {
        expect(screen.getByText(G1)).toBeInTheDocument()
      })
      expect(queryButton('Allow notifications')).not.toBeInTheDocument()
      expect(screen.getByRole('switch', { name: 'Sound' })).toHaveFocus()
    })

    it('blocked: N3 replaces the hint, button removed, focus to the Sound switch', async () => {
      const u = user()
      render(<App />)
      await openSettings(u)
      await u.click(button('Allow notifications'))
      act(() => {
        answer('denied')
      })
      await waitFor(() => {
        expect(screen.getByText(N3)).toBeInTheDocument()
      })
      expect(queryButton('Allow notifications')).not.toBeInTheDocument()
      expect(screen.getByRole('switch', { name: 'Sound' })).toHaveFocus()
    })

    it('dismissed: N2 and the button stay, focus stays on the button, retry works', async () => {
      const u = user()
      render(<App />)
      await openSettings(u)
      await u.click(button('Allow notifications'))
      act(() => {
        answer('default')
      })
      await waitFor(() => {
        expect(screen.getByText(N2)).toBeInTheDocument()
      })
      const again = button('Allow notifications')
      expect(again).toHaveFocus()
      expect(again).not.toHaveAttribute('aria-disabled')
      await u.click(again)
      expect(notification.requestPermission).toHaveBeenCalledTimes(2)
    })

    it('ignores a second click while the prompt is open', async () => {
      const u = user()
      render(<App />)
      await openSettings(u)
      await u.click(button('Allow notifications'))
      await u.click(button('Allow notifications'))
      expect(notification.requestPermission).toHaveBeenCalledTimes(1)
    })

    it('is independent of the draft: Cancel does not undo the permission', async () => {
      const u = user()
      render(<App />)
      await openSettings(u)
      await u.click(button('Allow notifications'))
      act(() => {
        answer('granted')
      })
      await waitFor(() => {
        expect(screen.getByText(G1)).toBeInTheDocument()
      })
      await u.click(button('Cancel'))
      expect(useTimerStore.getState().notifyAsked).toBe(true)
      await openSettings(u)
      expect(screen.getByText(G1)).toBeInTheDocument()
    })

    it('Tab order: Sound switch, Allow notifications, Cancel, Save', async () => {
      const u = user()
      render(<App />)
      await openSettings(u)
      screen.getByRole('switch', { name: 'Sound' }).focus()
      await u.tab()
      expect(button('Allow notifications')).toHaveFocus()
      await u.tab()
      expect(button('Cancel')).toHaveFocus()
      await u.tab()
      expect(button('Save')).toHaveFocus()
    })
  })
})

describe('phase-end caption (AC10, AC21)', () => {
  const timer = initialTimer(DEFAULT_SETTINGS)
  const end = { phaseId: 0, ended: 'focus', next: 'short', away: false } as const

  it('shows "<Phase> finished" after a natural end while idle', () => {
    render(<TimerDisplay timer={timer} lastEnd={end} now={0} />)
    expect(screen.getByText('Focus finished')).toBeInTheDocument()
  })

  it('adds "while you were away" for a missed end', () => {
    render(<TimerDisplay timer={timer} lastEnd={{ ...end, away: true }} now={0} />)
    expect(screen.getByText('Focus finished while you were away')).toBeInTheDocument()
  })

  it('shows no phase-end caption while running', () => {
    const running = { ...timer, status: 'running' as const, endAt: 1_500_000 }
    render(<TimerDisplay timer={running} lastEnd={end} now={0} />)
    expect(screen.queryByText(/finished/)).not.toBeInTheDocument()
  })
})
