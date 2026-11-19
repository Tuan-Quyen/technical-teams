import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import type { Timer } from '../domain/types.ts'
import { useTimerStore } from '../store/timerStore.ts'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function setTimer(over: Partial<Timer>) {
  useTimerStore.setState({
    settings: DEFAULT_SETTINGS,
    timer: { ...initialTimer(DEFAULT_SETTINGS), ...over },
    lastEnd: null,
    lastTransitionAt: 0,
  })
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
const phaseList = () => screen.getByRole('list', { name: 'Phase' })
const ringOffset = () =>
  Number(screen.getByTestId('ring-progress').getAttribute('stroke-dashoffset'))

describe('timer screen (M2)', () => {
  beforeEach(() => {
    // setTimeout stays real: the Testing Library async wrapper waits on it.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(T0)
    setTimer({})
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('phase tabs (AC24, BR-10)', () => {
    it('is a plain list, with no buttons, tab roles or tab stops inside', () => {
      render(<App />)
      const list = phaseList()
      expect(list.tagName).toBe('OL')
      expect(list.querySelectorAll('li')).toHaveLength(3)
      expect(list.querySelector('button, [role="tab"], [tabindex], a, [onclick]')).toBeNull()
      expect(screen.queryByRole('tab')).not.toBeInTheDocument()
      expect(list.querySelector('[aria-current="step"]')).toHaveTextContent('Focus')
    })

    it('user.tab() goes header, Reset, primary, Skip and never lands in the tabs', async () => {
      const u = user()
      render(<App />)
      const order = [
        'Enter focus mode',
        'Open settings',
        'Reset timer',
        'Start',
        'Skip to next phase',
      ]
      for (const name of order) {
        await u.tab()
        expect(screen.getByRole('button', { name })).toHaveFocus()
        expect(phaseList()).not.toContainElement(document.activeElement as HTMLElement)
      }
    })

    it('clicking a tab does nothing', async () => {
      const u = user()
      render(<App />)
      await u.click(screen.getByText('Long Break', { selector: 'li span' }))
      expect(useTimerStore.getState().timer.phase).toBe('focus')
    })

    it('registers no keydown listener on the document (AC24)', () => {
      const spy = vi.spyOn(document, 'addEventListener')
      render(<App />)
      expect(spy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0)
      spy.mockRestore()
    })
  })

  describe('cycle dots (AC8, AC9)', () => {
    it.each([0, 1, 2, 3, 4])('shows %i of 4 completed', (n) => {
      setTimer({ completed: n, phase: n === 4 ? 'long' : 'focus' })
      render(<App />)
      expect(
        screen.getByRole('img', { name: `${String(n)} of 4 focus sessions completed` }),
      ).toBeVisible()
      expect(screen.getByText(`${String(n)}/4`)).toBeInTheDocument()
    })
  })

  describe('Skip and Reset (AC5, AC6)', () => {
    it('Skip on Focus goes to Short Break without counting a session', async () => {
      const u = user()
      render(<App />)
      await u.click(screen.getByRole('button', { name: 'Skip to next phase' }))
      expect(phaseList().querySelector('[aria-current="step"]')).toHaveTextContent('Short Break')
      expect(screen.getByText('0/4')).toBeInTheDocument()
      expect(screen.getByRole('timer')).toHaveTextContent('05:00')
    })

    it('Reset is aria-disabled on a fresh phase and restores only the current phase otherwise', async () => {
      const u = user()
      render(<App />)
      const reset = screen.getByRole('button', { name: 'Reset timer' })
      expect(reset).toHaveAttribute('aria-disabled', 'true')

      await u.click(screen.getByRole('button', { name: 'Start' }))
      advance(5000)
      expect(reset).not.toHaveAttribute('aria-disabled')
      await u.click(reset)
      expect(screen.getByRole('timer')).toHaveTextContent('25:00')
      expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
      expect(phaseList().querySelector('[aria-current="step"]')).toHaveTextContent('Focus')
      expect(reset).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('header', () => {
    it('Open settings and Enter focus mode are live (not aria-disabled)', () => {
      render(<App />)
      for (const name of ['Open settings', 'Enter focus mode']) {
        expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-disabled')
      }
    })

    it('every button is at least 44 px (size-12 = 48 px, primary min-h-14)', () => {
      render(<App />)
      for (const b of screen.getAllByRole('button')) {
        expect(b.className).toMatch(/size-12|min-h-14/)
      }
    })
  })

  describe('progress ring (AC7)', () => {
    it('is hidden from screen readers and animates strokeDashoffset only', () => {
      render(<App />)
      const ring = screen.getByTestId('ring-progress')
      expect(ring.closest('svg')).toHaveAttribute('aria-hidden', 'true')
      expect(ringOffset()).toBe(1)
    })

    it('freezes exactly on Pause and continues on Resume', async () => {
      // Motion's frame loop stalls under the fake Date, so the running tween is covered in
      // ProgressRing.test.tsx; here only the exact values the ring is set to are checked.
      const u = user()
      render(<App />)
      await u.click(screen.getByRole('button', { name: 'Start' }))
      advance(5 * 60_000)
      await u.click(screen.getByRole('button', { name: 'Pause' }))
      await waitFor(() => {
        expect(ringOffset()).toBeCloseTo(0.8, 9)
      })
      advance(60_000)
      await new Promise((r) => setTimeout(r, 400))
      expect(ringOffset()).toBeCloseTo(0.8, 9)
      expect(screen.getByRole('timer')).toHaveTextContent('20:00')

      await u.click(screen.getByRole('button', { name: 'Resume' }))
      expect(screen.getByRole('timer')).toHaveTextContent('20:00')
      expect(ringOffset()).toBeCloseTo(0.8, 9)
    })

    it('draws the restored progress at once, with no entry animation', () => {
      setTimer({ status: 'paused', remainingMs: 15 * 60_000 })
      render(<App />)
      expect(ringOffset()).toBeCloseTo(0.6, 5)
    })
  })
})
