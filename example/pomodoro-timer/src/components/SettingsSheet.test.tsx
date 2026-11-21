import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.tsx'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import { useTimerStore } from '../store/timerStore.ts'

const storage = vi.hoisted(() => ({ available: true }))
vi.mock('../store/persistence.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/persistence.ts')>()
  return {
    ...actual,
    get storageAvailable() {
      return storage.available
    },
  }
})

const T0 = new Date('2026-01-01T10:00:00Z').getTime()
const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

const ERR_FOCUS = 'Enter a whole number from 1 to 120.'
const S1 =
  "Settings and progress won't be saved in this browser. Changes last until you close or reload the page."

function resetStore() {
  useTimerStore.setState({
    settings: DEFAULT_SETTINGS,
    timer: initialTimer(DEFAULT_SETTINGS),
    lastEnd: null,
    lastTransitionAt: 0,
  })
}

async function open(u: ReturnType<typeof user>) {
  await u.click(screen.getByRole('button', { name: 'Open settings' }))
  return screen.getByRole('dialog', { name: 'Settings' })
}

const field = (name: string) => screen.getByRole('textbox', { name })
const button = (name: string) => screen.getByRole('button', { name })
const sw = (name: string) => screen.getByRole('switch', { name })

async function setField(u: ReturnType<typeof user>, name: string, text: string) {
  await u.clear(field(name))
  if (text) await u.type(field(name), text)
}

describe('SettingsSheet (POMO-AC11-POMO-AC13, POMO-AC24, POMO-AC26)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(T0)
    storage.available = true
    resetStore()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens with saved values and focus in the Focus field', async () => {
    const u = user()
    render(<App />)
    const dialog = await open(u)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(field('Focus')).toHaveValue('25')
    expect(field('Short Break')).toHaveValue('5')
    expect(field('Long Break')).toHaveValue('15')
    expect(field('Focus')).toHaveFocus()
    expect(sw('Auto-start next phase')).toBeChecked()
    expect(sw('Sound')).toBeChecked()
    expect(screen.getByText('1–120 min')).toBeInTheDocument()
  })

  it('Save applies valid values to an idle phase, closes and returns focus (POMO-AC11)', async () => {
    const u = user()
    render(<App />)
    await open(u)
    await setField(u, 'Focus', '30')
    await u.click(sw('Sound'))
    await u.click(button('Save'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useTimerStore.getState().settings).toMatchObject({ focusMin: 30, soundOn: false })
    expect(screen.getByRole('timer')).toHaveTextContent('30:00')
    expect(button('Open settings')).toHaveFocus()
  })

  it.each([
    ['0', 'Focus', ERR_FOCUS],
    ['121', 'Focus', ERR_FOCUS],
    ['', 'Focus', ERR_FOCUS],
    ['1.5', 'Focus', ERR_FOCUS],
    ['31', 'Short Break', 'Enter a whole number from 1 to 30.'],
    ['61', 'Long Break', 'Enter a whole number from 1 to 60.'],
  ])('rejects %j in %s on Save: error shown, nothing written', async (text, name, msg) => {
    const u = user()
    render(<App />)
    await open(u)
    if (name !== 'Focus') await setField(u, 'Focus', '40') // a valid edit must not be saved either
    await setField(u, name, text)
    await u.click(button('Save'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText(msg)).toBeInTheDocument()
    expect(field(name)).toHaveAttribute('aria-invalid', 'true')
    expect(field(name)).toHaveFocus()
    expect(useTimerStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  })

  it('validates on blur, and the error clears once the text is valid', async () => {
    const u = user()
    render(<App />)
    await open(u)
    await setField(u, 'Focus', '0')
    await u.tab()
    expect(screen.getByText(ERR_FOCUS)).toBeInTheDocument()
    await setField(u, 'Focus', '12')
    expect(screen.queryByText(ERR_FOCUS)).not.toBeInTheDocument()
  })

  it('steppers move by one and are aria-disabled at the limits', async () => {
    const u = user()
    render(<App />)
    await open(u)
    await u.click(button('Increase Short Break'))
    expect(field('Short Break')).toHaveValue('6')
    await setField(u, 'Short Break', '30')
    expect(button('Increase Short Break')).toHaveAttribute('aria-disabled', 'true')
    await u.click(button('Increase Short Break'))
    expect(field('Short Break')).toHaveValue('30')
    await setField(u, 'Short Break', '1')
    expect(button('Decrease Short Break')).toHaveAttribute('aria-disabled', 'true')
    await u.click(button('Decrease Short Break'))
    expect(field('Short Break')).toHaveValue('1')
  })

  it('Cancel and Esc discard the draft and return focus', async () => {
    const u = user()
    render(<App />)
    for (const close of [() => u.click(button('Cancel')), () => u.keyboard('{Escape}')]) {
      await open(u)
      await setField(u, 'Focus', '50')
      await close()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(button('Open settings')).toHaveFocus()
      expect(useTimerStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    }
    await open(u)
    expect(field('Focus')).toHaveValue('25')
  })

  it('clicking the scrim discards the draft and closes', async () => {
    const u = user()
    render(<App />)
    await open(u)
    await setField(u, 'Focus', '50')
    const scrim = screen.getByRole('dialog').previousElementSibling
    expect(scrim).not.toBeNull()
    await u.click(scrim as Element)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useTimerStore.getState().settings).toEqual(DEFAULT_SETTINGS)
    expect(button('Open settings')).toHaveFocus()
  })

  it('keeps focus inside after a click on plain content: Esc closes, Tab and Shift+Tab cycle', async () => {
    const u = user()
    render(<App />)
    await open(u)
    await u.click(screen.getByRole('heading', { name: 'Settings' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveFocus()
    expect(dialog).toHaveAttribute('tabindex', '-1')
    await u.tab()
    expect(button('Decrease Focus')).toHaveFocus()
    await u.click(screen.getByRole('heading', { name: 'Settings' }))
    await u.tab({ shift: true })
    expect(button('Save')).toHaveFocus()
    await u.click(screen.getByRole('heading', { name: 'Settings' }))
    await u.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(button('Open settings')).toHaveFocus()
  })

  it('the dialog itself is not a Tab stop', async () => {
    const u = user()
    render(<App />)
    await open(u)
    for (let i = 0; i < 14; i++) {
      await u.tab()
      expect(screen.getByRole('dialog')).not.toHaveFocus()
    }
  })

  it('Enter in a field saves', async () => {
    const u = user()
    render(<App />)
    await open(u)
    await setField(u, 'Long Break', '20')
    await u.keyboard('{Enter}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useTimerStore.getState().settings.longMin).toBe(20)
  })

  it('a running phase keeps its length; the next phase uses the new one (POMO-AC13)', async () => {
    const u = user()
    render(<App />)
    await u.click(button('Start'))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    await open(u)
    expect(
      screen.getByText(
        'The current phase keeps its length. New durations apply from the next phase.',
      ),
    ).toBeInTheDocument()
    await setField(u, 'Focus', '50')
    await u.click(button('Save'))
    expect(useTimerStore.getState().settings.focusMin).toBe(50)
    expect(useTimerStore.getState().timer.durationMs).toBe(25 * 60_000)
    expect(screen.getByRole('timer')).toHaveTextContent('24:59')
    expect(button('Pause')).toBeInTheDocument()
  })

  it('hides the durations note while idle', async () => {
    const u = user()
    render(<App />)
    await open(u)
    expect(screen.queryByText(/current phase keeps its length/)).not.toBeInTheDocument()
  })

  it('Tab order follows the spec and wraps inside the dialog (POMO-AC24)', async () => {
    const u = user()
    render(<App />)
    await open(u)
    const expected = [
      button('Increase Focus'),
      button('Decrease Short Break'),
      field('Short Break'),
      button('Increase Short Break'),
      button('Decrease Long Break'),
      field('Long Break'),
      button('Increase Long Break'),
      sw('Auto-start next phase'),
      sw('Sound'),
      button('Cancel'),
      button('Save'),
    ]
    const seen: Element[] = []
    for (let i = 0; i < expected.length; i++) {
      await u.tab()
      if (document.activeElement) seen.push(document.activeElement)
    }
    expect(seen).toEqual(expected)
    await u.tab()
    expect(button('Decrease Focus')).toHaveFocus()
    await u.tab({ shift: true })
    expect(button('Save')).toHaveFocus()
  })

  it('switches toggle with Space and Enter', async () => {
    const u = user()
    render(<App />)
    await open(u)
    sw('Auto-start next phase').focus()
    await u.keyboard(' ')
    expect(sw('Auto-start next phase')).not.toBeChecked()
    await u.keyboard('{Enter}')
    expect(sw('Auto-start next phase')).toBeChecked()
  })

  it('registers no keydown listener on the document (POMO-AC24)', async () => {
    const u = user()
    const spy = vi.spyOn(document, 'addEventListener')
    render(<App />)
    await open(u)
    expect(spy.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(0)
    spy.mockRestore()
  })

  describe('storage hint (POMO-AC26)', () => {
    it('is hidden when storage works', async () => {
      const u = user()
      render(<App />)
      await open(u)
      expect(screen.queryByText(S1)).not.toBeInTheDocument()
    })

    it('is the first row of the body when storage is unavailable, and not focusable', async () => {
      storage.available = false
      const u = user()
      render(<App />)
      const dialog = await open(u)
      const row = within(dialog).getByText(S1).closest('div')
      expect(row?.parentElement?.firstElementChild).toBe(row)
      expect(row?.querySelector('[tabindex], button, a, input')).toBeNull()
      await setField(u, 'Focus', '35')
      await u.click(button('Save'))
      await waitFor(() => {
        expect(useTimerStore.getState().settings.focusMin).toBe(35)
      })
    })
  })
})
