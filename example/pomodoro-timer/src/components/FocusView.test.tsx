import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import { useTimerStore } from '../store/timerStore.ts'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()
const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
const view = () => screen.getByRole('dialog', { name: 'Focus mode' })
/** Controls of the open Focus view; the page behind stays in the DOM (aria-modal, not inert). */
const inView = (name: string) => within(view()).getByRole('button', { name })
const button = (name: string) => screen.getByRole('button', { name })

function resetStore() {
  useTimerStore.setState({
    settings: DEFAULT_SETTINGS,
    timer: initialTimer(DEFAULT_SETTINGS),
    lastEnd: null,
    lastTransitionAt: 0,
  })
}

function stubNative(request: () => Promise<void>) {
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })
  Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true })
  const requestFullscreen = vi.fn(request)
  document.documentElement.requestFullscreen = requestFullscreen
  document.exitFullscreen = vi.fn(() => Promise.resolve())
  return requestFullscreen
}

describe('Focus mode (POMO-AC17, POMO-E7, POMO-AC24)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(T0)
    resetStore()
  })
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(document, 'fullscreenEnabled')
    Reflect.deleteProperty(document, 'fullscreenElement')
    Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
  })

  describe('overlay fallback (no Fullscreen API)', () => {
    it('opens a modal view with phase, digits, controls and Exit; focus lands on the primary', async () => {
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      const v = view()
      expect(v).toHaveAttribute('aria-modal', 'true')
      expect(v).toHaveTextContent('Focus')
      expect(v).toHaveTextContent('25:00')
      expect(v.querySelector('[role="timer"]')).not.toBeNull()
      expect(v.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
      expect(button('Exit focus mode')).toBeInTheDocument()
      expect(inView('Start')).toHaveFocus()
    })

    it('uses the larger ring and the 96-208 px digits, and the primary carries data-autofocus', async () => {
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      const digits = within(view()).getByRole('timer')
      expect(digits.className).toContain('clamp(6rem,24vw,13rem)')
      expect(digits.className).toContain('28cqw')
      expect(digits.closest('[class~="@container"]')).not.toBeNull()
      expect(inView('Start')).toHaveAttribute('data-autofocus')
    })

    it('Tab order is Exit, Reset, primary, Skip, and wraps inside the view', async () => {
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      await u.tab() // Skip
      expect(inView('Skip to next phase')).toHaveFocus()
      await u.tab() // wraps to Exit
      expect(button('Exit focus mode')).toHaveFocus()
      await u.tab()
      expect(inView('Reset timer')).toHaveFocus()
      await u.tab()
      expect(inView('Start')).toHaveFocus()
      await u.tab({ shift: true })
      await u.tab({ shift: true })
      expect(button('Exit focus mode')).toHaveFocus()
      await u.tab({ shift: true })
      expect(inView('Skip to next phase')).toHaveFocus()
    })

    it('Exit button closes it and returns focus to Enter focus mode', async () => {
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      await u.click(button('Exit focus mode'))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(button('Enter focus mode')).toHaveFocus()
    })

    it('Esc closes it', async () => {
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      await u.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(button('Enter focus mode')).toHaveFocus()
    })

    it('the timer is unaffected by entering, running inside and leaving', async () => {
      const u = user()
      render(<App />)
      await u.click(button('Start'))
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      const before = useTimerStore.getState().timer
      await u.click(button('Enter focus mode'))
      expect(useTimerStore.getState().timer).toBe(before)
      expect(view()).toHaveTextContent('24:59')
      await u.click(inView('Pause'))
      expect(view()).toHaveTextContent('Paused')
      await u.click(button('Exit focus mode'))
      expect(useTimerStore.getState().timer.status).toBe('paused')
      expect(screen.getByRole('timer')).toHaveTextContent('24:59')
    })

    it('registers no keydown listener on the document', async () => {
      const u = user()
      const spy = vi.spyOn(document, 'addEventListener')
      render(<App />)
      await u.click(button('Enter focus mode'))
      expect(spy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0)
      spy.mockRestore()
    })
  })

  describe('native fullscreen', () => {
    it('requests fullscreen on <html> from the click and shows the same view', async () => {
      const request = stubNative(() => Promise.resolve())
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      expect(request).toHaveBeenCalledTimes(1)
      expect(view()).toHaveTextContent('25:00')
    })

    it("the browser's own exit (fullscreenchange) closes the view", async () => {
      stubNative(() => Promise.resolve())
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      await act(async () => {
        await Promise.resolve()
      })
      // fullscreenElement is already null: the browser left fullscreen on its own.
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'))
      })
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('a refused request keeps the overlay open (POMO-E7)', async () => {
      stubNative(() => Promise.reject(new TypeError('denied')))
      const u = user()
      render(<App />)
      await u.click(button('Enter focus mode'))
      await act(async () => {
        await Promise.resolve()
      })
      expect(view()).toBeInTheDocument()
      // A browser exit event must not close an overlay that never went native.
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'))
      })
      expect(view()).toBeInTheDocument()
    })
  })

  describe('Exit button dimming', () => {
    it('dims to 60 % after 3 s idle and returns to 100 % on pointer move or focus', () => {
      vi.useRealTimers()
      vi.useFakeTimers()
      render(<App />)
      fireEvent.click(button('Enter focus mode'))
      const exit = button('Exit focus mode')
      expect(exit).toHaveClass('opacity-100')
      act(() => {
        vi.advanceTimersByTime(3100)
      })
      expect(exit).toHaveClass('opacity-60')
      fireEvent.pointerMove(view())
      expect(exit).toHaveClass('opacity-100')
      act(() => {
        vi.advanceTimersByTime(3100)
      })
      expect(exit).toHaveClass('opacity-60')
      fireEvent.focus(exit)
      expect(exit).toHaveClass('opacity-100')
    })
  })
})
