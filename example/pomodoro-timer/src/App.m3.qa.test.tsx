import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { startRuntime } from './app/runtime.ts'
import { DEFAULT_SETTINGS } from './domain/settings.ts'
import { initialTimer } from './domain/timer.ts'
import { phaseEnded, resetAlerts } from './services/alerts.ts'
import * as chime from './services/chime.ts'
import { useTimerStore } from './store/timerStore.ts'

const MIN = 60_000
const T0 = new Date('2026-01-01T10:00:00Z').getTime()

const audio = { oscillators: 0 }
const shown: string[] = []

class FakeAudioContext {
  currentTime = 0
  destination = {}
  state = 'running'
  resume() {
    return Promise.resolve()
  }
  createOscillator() {
    audio.oscillators++
    return {
      type: '',
      frequency: { value: 0 },
      start: vi.fn(),
      stop: vi.fn(),
      connect: () => ({ connect: vi.fn() }),
    }
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }
  }
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

// QA (POMO-M3): the real main.tsx wiring (restoreOnLoad + startRuntime(phaseEnded)) under the real App.
describe('QA: alerts wired end to end (POMO-AC14, POMO-AC16, POMO-AC21, POMO-E4, POMO-E12)', () => {
  let stop: (() => void) | undefined
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
    })
    vi.setSystemTime(T0)
    audio.oscillators = 0
    shown.length = 0
    chime.disarm()
    resetAlerts()
    vi.stubGlobal('AudioContext', FakeAudioContext)
    vi.stubGlobal(
      'Notification',
      Object.assign(
        vi.fn(function (title: string) {
          shown.push(title)
        }),
        { permission: 'granted' },
      ),
    )
    Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true })
    const settings = { ...DEFAULT_SETTINGS, focusMin: 1, shortMin: 1, longMin: 1 }
    useTimerStore.setState({
      settings,
      timer: initialTimer(settings),
      lastEnd: null,
      lastTransitionAt: 0,
    })
  })
  afterEach(() => {
    stop?.()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('natural end: one chime, one notification, title and announcement follow; a visibility event at the end adds nothing (POMO-E4)', () => {
    stop = startRuntime({ onPhaseEnd: phaseEnded })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    expect(document.title).toBe('01:00 · Focus — Pomodoro')
    advance(MIN)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
    advance(1000)
    expect(audio.oscillators).toBe(2)
    expect(shown).toHaveLength(1)
    expect(shown[0]).toMatch(/Focus/)
    expect(shown[0]).toMatch(/Short Break/)
    expect(screen.getByRole('status')).toHaveTextContent(/Focus finished/)
    expect(document.title).toMatch(/Short Break — Pomodoro$/)
    expect(useTimerStore.getState().timer.completed).toBe(1)
  })

  it('Skip and Reset raise no alert', () => {
    stop = startRuntime({ onPhaseEnd: phaseEnded })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    advance(2000)
    fireEvent.click(screen.getByRole('button', { name: 'Skip to next phase' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }))
    expect(shown).toHaveLength(0)
    expect(audio.oscillators).toBe(0)
  })

  it('reload with an overdue phase: one notification, caption, no chime, no auto-start (POMO-AC21)', () => {
    const s = useTimerStore.getState()
    useTimerStore.setState({
      timer: {
        ...s.timer,
        status: 'running',
        endAt: T0 - 3 * MIN,
        remainingMs: MIN,
        durationMs: MIN,
      },
    })
    useTimerStore.getState().restoreOnLoad()
    stop = startRuntime({ onPhaseEnd: phaseEnded })
    render(<App />)
    expect(shown).toHaveLength(1)
    expect(audio.oscillators).toBe(0)
    expect(screen.getByText('Focus finished while you were away')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
    expect(document.title).toBe('Pomodoro')
  })
})
