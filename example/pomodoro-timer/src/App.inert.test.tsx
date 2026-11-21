import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { DEFAULT_SETTINGS } from './domain/settings.ts'
import { initialTimer } from './domain/timer.ts'
import { useTimerStore } from './store/timerStore.ts'

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
const button = (name: string) => screen.getByRole('button', { name })
const inertRoots = () => document.querySelectorAll('[inert]')

// jsdom ignores `inert`; a browser refuses to focus anything inside an inert subtree. Emulate
// that, so the focus-return assertions fail if `inert` were still set when focus is restored.
type Focus = (this: HTMLElement, options?: FocusOptions) => void
const realFocus = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'focus')?.value as Focus

describe('page is inert while a dialog is open (POMO-R13)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z').getTime())
    useTimerStore.setState({
      settings: DEFAULT_SETTINGS,
      timer: initialTimer(DEFAULT_SETTINGS),
      lastEnd: null,
      lastTransitionAt: 0,
    })
    HTMLElement.prototype.focus = function focus(this: HTMLElement, options?: FocusOptions) {
      if (this.closest('[inert]')) return
      realFocus.call(this, options)
    }
  })
  afterEach(() => {
    HTMLElement.prototype.focus = realFocus
    vi.useRealTimers()
  })

  it.each([
    ['Open settings', 'Settings', 'Cancel'],
    ['Enter focus mode', 'Focus mode', 'Exit focus mode'],
  ])(
    '%s: inert while open, never around the dialog or live region, focus returns',
    async (opener, dialogName, closeName) => {
      const u = user()
      render(<App />)
      expect(inertRoots()).toHaveLength(0)

      await u.click(button(opener))
      const dialog = screen.getByRole('dialog', { name: dialogName })
      const roots = inertRoots()
      expect(roots).toHaveLength(1)
      expect(roots[0]).toContainElement(button(opener))
      expect(roots[0]).not.toContainElement(dialog)
      expect(roots[0]).not.toContainElement(screen.getByRole('status'))
      expect(dialog.closest('[inert]')).toBeNull()
      expect(screen.getByRole('status').closest('[inert]')).toBeNull()
      expect(dialog.contains(document.activeElement)).toBe(true)

      await u.click(within(dialog).getByRole('button', { name: closeName }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(inertRoots()).toHaveLength(0)
      expect(button(opener)).toHaveFocus()
    },
  )

  it('Esc also lifts inert and returns focus', async () => {
    const u = user()
    render(<App />)
    await u.click(button('Open settings'))
    await u.keyboard('{Escape}')
    expect(inertRoots()).toHaveLength(0)
    expect(button('Open settings')).toHaveFocus()
  })
})
