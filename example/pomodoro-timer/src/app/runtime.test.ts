import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { AWAY_MS, initialTimer } from '../domain/timer.ts'
import type { PhaseEnd } from '../domain/types.ts'
import { useNow } from '../hooks/useNow.ts'
import { STORAGE_KEY } from '../store/persistence.ts'
import { createTimerStore, useTimerStore } from '../store/timerStore.ts'
import { startRuntime } from './runtime.ts'

const MIN = 60_000
const T0 = 1_000_000
const FOCUS_END = T0 + 25 * MIN

function memory(): StateStorage {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
    removeItem: (k) => {
      data.delete(k)
    },
  }
}

function setup(storage: StateStorage = memory()) {
  const store = createTimerStore(storage)
  const ends: PhaseEnd[] = []
  const stop = startRuntime({
    store,
    onPhaseEnd: (end) => {
      ends.push(end)
    },
  })
  return { store, ends, stop, storage }
}

function fireVisibility() {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('runtime', () => {
  let stop: (() => void) | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    delete document.documentElement.dataset.phase
  })
  afterEach(() => {
    stop?.()
    stop = undefined
    vi.useRealTimers()
  })

  describe('end timeout', () => {
    it('fires once at endAt: next phase starts (Auto-start on), one phase end', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.advanceTimersByTime(25 * MIN - 1)
      expect(s.ends).toHaveLength(0)
      expect(s.store.getState().timer.phase).toBe('focus')

      vi.advanceTimersByTime(51)
      expect(s.ends).toEqual([{ phaseId: 0, ended: 'focus', next: 'short', away: false }])
      expect(s.store.getState().timer).toMatchObject({
        phase: 'short',
        status: 'running',
        completed: 1,
        phaseId: 1,
      })

      vi.advanceTimersByTime(10_000)
      expect(s.ends).toHaveLength(1)
      expect(s.store.getState().timer.completed).toBe(1)
    })

    it('with Auto-start off the next phase waits idle', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().saveSettings({ ...s.store.getState().settings, autoStart: false })
      s.store.getState().start()
      vi.advanceTimersByTime(25 * MIN + 100)
      expect(s.store.getState().timer).toMatchObject({ phase: 'short', status: 'idle' })
      expect(s.ends[0]?.away).toBe(false)
    })

    it('is re-armed after Pause / Resume and cleared while paused', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.advanceTimersByTime(10 * MIN)
      s.store.getState().pause()
      vi.advanceTimersByTime(60 * MIN)
      expect(s.ends).toHaveLength(0)
      s.store.getState().start()
      vi.advanceTimersByTime(15 * MIN - 1)
      expect(s.ends).toHaveLength(0)
      vi.advanceTimersByTime(100)
      expect(s.ends).toHaveLength(1)
    })

    it('Skip and Reset never emit a phase end and drop the old timeout', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.advanceTimersByTime(5 * MIN)
      s.store.getState().reset()
      vi.advanceTimersByTime(60 * MIN)
      expect(s.ends).toHaveLength(0)
      expect(s.store.getState().timer.status).toBe('idle')
      s.store.getState().skip()
      expect(s.ends).toHaveLength(0)
    })

    it('retries when the clock is behind endAt, then ends once', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      // clock set back after the timeout was armed: the first firing finds the phase not over
      vi.setSystemTime(T0 - 10_000)
      vi.advanceTimersByTime(25 * MIN + 100)
      expect(s.ends).toHaveLength(0)
      vi.setSystemTime(FOCUS_END + 1)
      vi.advanceTimersByTime(60_000)
      expect(s.ends).toHaveLength(1)
    })
  })

  describe('resync (POMO-AC18, POMO-E4)', () => {
    it('visibilitychange at endAt completes once; the later timeout does nothing', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.setSystemTime(FOCUS_END)
      fireVisibility()
      expect(s.ends).toHaveLength(1)
      expect(s.store.getState().timer.phaseId).toBe(1)
      vi.advanceTimersByTime(30 * MIN)
      // the short break ran its own 5 min; only that second end may have been added
      expect(s.ends.filter((e) => e.phaseId === 0)).toHaveLength(1)
    })

    it('window focus also settles an end', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.setSystemTime(FOCUS_END + 5_000)
      window.dispatchEvent(new Event('focus'))
      expect(s.ends).toHaveLength(1)
      expect(s.store.getState().timer.phase).toBe('short')
    })

    it('does nothing while a phase is paused or idle (POMO-E4)', () => {
      const s = setup()
      stop = s.stop
      fireVisibility()
      window.dispatchEvent(new Event('focus'))
      s.store.getState().start()
      s.store.getState().pause()
      vi.setSystemTime(FOCUS_END + 10 * MIN)
      fireVisibility()
      expect(s.ends).toHaveLength(0)
      expect(s.store.getState().timer.status).toBe('paused')
    })

    it('ignores visibilitychange while the page is hidden', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.setSystemTime(FOCUS_END)
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      expect(s.ends).toHaveLength(0)
    })
  })

  describe('away rule (POMO-AC10, POMO-AC21)', () => {
    it('exactly AWAY_MS late still auto-starts from now', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.setSystemTime(FOCUS_END + AWAY_MS)
      fireVisibility()
      expect(s.ends[0]).toMatchObject({ away: false })
      expect(s.store.getState().timer).toMatchObject({
        phase: 'short',
        status: 'running',
        endAt: FOCUS_END + AWAY_MS + 5 * MIN,
      })
    })

    it('AWAY_MS + 1 ms late leaves the next phase idle with an away end', () => {
      const s = setup()
      stop = s.stop
      s.store.getState().start()
      vi.setSystemTime(FOCUS_END + AWAY_MS + 1)
      fireVisibility()
      expect(s.ends[0]).toMatchObject({ away: true })
      expect(s.store.getState().timer).toMatchObject({ phase: 'short', status: 'idle' })
    })

    it('a phase that ended while closed is dispatched once at start, as away, never running', () => {
      const storage = memory()
      const before = createTimerStore(storage)
      before.getState().start()
      vi.setSystemTime(FOCUS_END + 10 * MIN)
      const store = createTimerStore(storage)
      store.getState().restoreOnLoad()
      const ends: PhaseEnd[] = []
      stop = startRuntime({ store, onPhaseEnd: (e) => ends.push(e) })
      expect(ends).toEqual([{ phaseId: 0, ended: 'focus', next: 'short', away: true }])
      expect(store.getState().timer.status).toBe('idle')
      vi.advanceTimersByTime(60 * MIN)
      expect(ends).toHaveLength(1)
    })
  })

  describe('storage event (POMO-AC23)', () => {
    it('rehydrates from the other tab and re-arms for its endAt', async () => {
      const storage = memory()
      const s = setup(storage)
      stop = s.stop
      const other = createTimerStore(storage)
      other.getState().start()
      expect(s.store.getState().timer.status).toBe('idle')

      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{}' }))
      await vi.advanceTimersByTimeAsync(0)
      expect(s.store.getState().timer).toMatchObject({ status: 'running', endAt: FOCUS_END })

      await vi.advanceTimersByTimeAsync(25 * MIN + 100)
      expect(s.ends).toHaveLength(1)
    })

    it('adopts a pause from the other tab and drops the old timeout', async () => {
      const storage = memory()
      const s = setup(storage)
      stop = s.stop
      s.store.getState().start()
      const other = createTimerStore(storage)
      vi.advanceTimersByTime(MIN)
      other.getState().pause()
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{}' }))
      await vi.advanceTimersByTimeAsync(0)
      expect(s.store.getState().timer.status).toBe('paused')
      await vi.advanceTimersByTimeAsync(60 * MIN)
      expect(s.ends).toHaveLength(0)
    })

    it('ignores the key being removed or cleared: this tab keeps its running timer (POMO-S4)', async () => {
      const storage = memory()
      const s = setup(storage)
      stop = s.stop
      s.store.getState().start()
      const running = s.store.getState().timer
      storage.removeItem(STORAGE_KEY)
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: null }))
      window.dispatchEvent(new StorageEvent('storage', { key: null })) // localStorage.clear()
      await vi.advanceTimersByTimeAsync(0)
      expect(s.store.getState().timer).toBe(running)
      await vi.advanceTimersByTimeAsync(25 * MIN + 100)
      expect(s.ends).toHaveLength(1)
    })

    it('ignores other keys', async () => {
      const storage = memory()
      const s = setup(storage)
      stop = s.stop
      createTimerStore(storage).getState().start()
      window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }))
      await vi.advanceTimersByTimeAsync(0)
      expect(s.store.getState().timer.status).toBe('idle')
    })

    it('a phase already completed by the other tab is not completed or alerted again', async () => {
      const storage = memory()
      const s = setup(storage)
      stop = s.stop
      s.store.getState().start()
      const other = createTimerStore(storage)
      other.getState().start()
      vi.setSystemTime(FOCUS_END)
      other.getState().sync('live') // the other tab ends the phase first and writes it
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{}' }))
      await vi.advanceTimersByTimeAsync(0)
      expect(s.store.getState().timer).toMatchObject({ phase: 'short', phaseId: 1, completed: 1 })
      expect(s.ends).toHaveLength(0)
    })
  })

  describe('end timeout bounds (POMO-S1, POMO-R9)', () => {
    it('clamps the delay: an endAt beyond 2^31 ms neither fires at once nor loops', () => {
      const s = setup()
      stop = s.stop
      const timer = s.store.getState().timer
      s.store.setState({ timer: { ...timer, status: 'running', endAt: T0 + 2 ** 40 } })
      expect(vi.getTimerCount()).toBe(1)
      vi.advanceTimersByTime(60_000)
      expect(s.ends).toHaveLength(0)
      expect(vi.getTimerCount()).toBe(1)
      expect(s.store.getState().timer.phaseId).toBe(0)
    })
  })

  describe('data-phase', () => {
    it('is set at start and follows the phase', () => {
      const s = setup()
      stop = s.stop
      expect(document.documentElement.dataset.phase).toBe('focus')
      s.store.getState().skip()
      expect(document.documentElement.dataset.phase).toBe('short')
      vi.advanceTimersByTime(MIN)
      s.store.getState().skip()
      expect(document.documentElement.dataset.phase).toBe('focus')
    })

    it('uses long for the Long Break', () => {
      const s = setup()
      stop = s.stop
      s.store.setState({
        timer: { ...s.store.getState().timer, completed: 4, phase: 'long', phaseId: 7 },
      })
      expect(document.documentElement.dataset.phase).toBe('long')
    })
  })

  describe('lifecycle', () => {
    it('is idempotent: a second start returns the same runtime, one set of effects', () => {
      const store = createTimerStore(memory())
      const a: PhaseEnd[] = []
      const b: PhaseEnd[] = []
      const stopA = startRuntime({ store, onPhaseEnd: (e) => a.push(e) })
      const stopB = startRuntime({ store, onPhaseEnd: (e) => b.push(e) })
      stop = stopA
      expect(stopB).toBe(stopA)
      store.getState().start()
      vi.advanceTimersByTime(25 * MIN + 100)
      expect(a).toHaveLength(1)
      expect(b).toHaveLength(0)
    })

    it('stop removes timers, listeners and the subscription; start works again', () => {
      const s = setup()
      s.store.getState().start()
      s.stop()
      vi.advanceTimersByTime(60 * MIN)
      vi.setSystemTime(FOCUS_END + 1)
      fireVisibility()
      expect(s.ends).toHaveLength(0)
      expect(s.store.getState().timer.phaseId).toBe(0)

      const again = setup()
      stop = again.stop
      expect(again.stop).not.toBe(s.stop)
    })
  })

  describe('with the useNow tick (same phase, two triggers)', () => {
    it('the end is handled once even though the hook, the timeout and a resync all see zero', () => {
      // useNow reads the app singleton, so run the runtime on that same store
      const settings = { ...DEFAULT_SETTINGS, autoStart: false }
      useTimerStore.setState({
        settings,
        timer: initialTimer(settings),
        lastEnd: null,
        lastTransitionAt: 0,
      })
      const ends: PhaseEnd[] = []
      stop = startRuntime({ onPhaseEnd: (e) => ends.push(e) })
      useTimerStore.getState().start()
      const { unmount } = renderHook(() => useNow(true))

      vi.setSystemTime(FOCUS_END)
      act(() => {
        fireVisibility() // runtime path
      })
      act(() => {
        vi.advanceTimersByTime(1_000) // hook tick and runtime timeout paths
      })
      expect(ends).toHaveLength(1)
      expect(useTimerStore.getState().timer).toMatchObject({ phaseId: 1, completed: 1 })
      unmount()
    })
  })
})
