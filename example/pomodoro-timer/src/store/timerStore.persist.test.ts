import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { StateStorage } from 'zustand/middleware'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import type { Settings } from '../domain/types.ts'
import { createSafeStorage, STORAGE_KEY } from './persistence.ts'
import { createTimerStore } from './timerStore.ts'

const MIN = 60_000
const T0 = 1_000_000

function memory(initial?: string): StateStorage & { data: Map<string, string> } {
  const data = new Map<string, string>(initial === undefined ? [] : [[STORAGE_KEY, initial]])
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
    removeItem: (k) => {
      data.delete(k)
    },
  }
}

describe('persisted store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('writes only settings, timer and notifyAsked under the single key, at version 1', () => {
    const storage = memory()
    const store = createTimerStore(storage)
    store.getState().start()
    const saved = JSON.parse(storage.data.get(STORAGE_KEY) ?? 'null') as {
      state: Record<string, unknown>
      version: number
    }
    expect(saved.version).toBe(1)
    expect(Object.keys(saved.state).sort()).toEqual(['notifyAsked', 'settings', 'timer'])
    expect([...storage.data.keys()]).toEqual([STORAGE_KEY])
  })

  describe('reload over the same storage', () => {
    it('running: continues with the same endAt (AC19)', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      a.getState().start()
      vi.advanceTimersByTime(10 * MIN)
      const b = createTimerStore(storage)
      b.getState().restoreOnLoad()
      expect(b.getState().timer).toMatchObject({
        status: 'running',
        endAt: T0 + 25 * MIN,
        phase: 'focus',
      })
      expect(b.getState().lastEnd).toBeNull()
    })

    it('paused: exact remaining, still paused (AC20)', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      a.getState().start()
      vi.advanceTimersByTime(10 * MIN + 3_000)
      a.getState().pause()
      vi.advanceTimersByTime(60 * MIN)
      const b = createTimerStore(storage)
      b.getState().restoreOnLoad()
      expect(b.getState().timer).toMatchObject({
        status: 'paused',
        remainingMs: 15 * MIN - 3_000,
        endAt: null,
      })
    })

    it('overdue: next phase idle at full duration, away lastEnd, no auto-start (AC21)', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      a.getState().start()
      vi.advanceTimersByTime(28 * MIN)
      const b = createTimerStore(storage)
      b.getState().restoreOnLoad()
      expect(b.getState().timer).toMatchObject({
        phase: 'short',
        status: 'idle',
        endAt: null,
        remainingMs: 5 * MIN,
        completed: 1,
        phaseId: 1,
      })
      expect(b.getState().lastEnd).toEqual({
        phaseId: 0,
        ended: 'focus',
        next: 'short',
        away: true,
      })
    })

    it('overdue restore does not double-count: restoring again, or reloading, changes nothing', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      a.getState().start()
      vi.advanceTimersByTime(40 * MIN)
      const b = createTimerStore(storage)
      b.getState().restoreOnLoad()
      const afterFirst = b.getState().timer
      b.getState().restoreOnLoad()
      expect(b.getState().timer).toBe(afterFirst)
      const c = createTimerStore(storage)
      c.getState().restoreOnLoad()
      expect(c.getState().timer).toEqual(afterFirst)
      expect(c.getState().timer.completed).toBe(1)
      expect(c.getState().lastEnd).toBeNull()
    })

    it('overdue with Auto-start on never auto-starts after a reload', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      expect(a.getState().settings.autoStart).toBe(true)
      a.getState().start()
      vi.advanceTimersByTime(25 * MIN + 1)
      const b = createTimerStore(storage)
      b.getState().restoreOnLoad()
      expect(b.getState().timer.status).toBe('idle')
    })

    it('does not persist lastEnd', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      a.getState().start()
      vi.advanceTimersByTime(30 * MIN)
      a.getState().restoreOnLoad()
      expect(a.getState().lastEnd).not.toBeNull()
      expect(createTimerStore(storage).getState().lastEnd).toBeNull()
    })

    it('keeps settings and notifyAsked', () => {
      const storage = memory()
      const a = createTimerStore(storage)
      a.getState().saveSettings({ ...DEFAULT_SETTINGS, focusMin: 50, autoStart: false })
      a.getState().markNotifyAsked()
      const b = createTimerStore(storage).getState()
      expect(b.settings).toMatchObject({ focusMin: 50, autoStart: false })
      expect(b.notifyAsked).toBe(true)
    })
  })

  describe('bad stored data (E2, E10)', () => {
    it('corrupt JSON starts fresh with defaults', () => {
      const s = createTimerStore(createSafeStorage(() => stringStorage('{not json'))).getState()
      expect(s.settings).toEqual(DEFAULT_SETTINGS)
      expect(s.timer).toMatchObject({ phase: 'focus', status: 'idle', remainingMs: 25 * MIN })
    })

    it('focusMin -5 falls back to 25 while other fields are kept', () => {
      const stored = JSON.stringify({
        state: { settings: { ...DEFAULT_SETTINGS, focusMin: -5, shortMin: 7 } },
        version: 1,
      })
      const s = createTimerStore(memory(stored)).getState()
      expect(s.settings.focusMin).toBe(25)
      expect(s.settings.shortMin).toBe(7)
    })

    it('an invalid timer resets to a fresh Focus built from the stored settings', () => {
      const stored = JSON.stringify({
        state: {
          settings: { ...DEFAULT_SETTINGS, focusMin: 40 },
          timer: { phase: 'focus', status: 'running', endAt: null },
        },
        version: 1,
      })
      const s = createTimerStore(memory(stored)).getState()
      expect(s.timer).toMatchObject({ status: 'idle', durationMs: 40 * MIN })
    })

    it('an unknown version is still validated field by field', () => {
      const stored = JSON.stringify({ state: { settings: { focusMin: 33 } }, version: 99 })
      expect(createTimerStore(memory(stored)).getState().settings.focusMin).toBe(33)
    })

    it('valid JSON of the wrong shape starts fresh', () => {
      for (const raw of ['123', '"x"', '[]', 'null', '{}']) {
        const s = createTimerStore(memory(raw)).getState()
        expect(s.settings).toEqual(DEFAULT_SETTINGS)
        expect(s.timer.status).toBe('idle')
      }
    })

    it('a non-boolean notifyAsked becomes false', () => {
      const stored = JSON.stringify({ state: { notifyAsked: 'yes' }, version: 1 })
      expect(createTimerStore(memory(stored)).getState().notifyAsked).toBe(false)
    })

    it('a throwing localStorage still gives a working in-memory timer', () => {
      const boom = () => {
        throw new DOMException('blocked', 'SecurityError')
      }
      const storage = createSafeStorage(() => ({
        getItem: boom,
        setItem: boom,
        removeItem: boom,
        clear: boom,
        key: boom,
        length: 0,
      }))
      const store = createTimerStore(storage)
      expect(() => {
        store.getState().start()
        vi.advanceTimersByTime(1_000)
        store.getState().pause()
        store.getState().markNotifyAsked()
      }).not.toThrow()
      expect(store.getState().timer.status).toBe('paused')
      expect(store.getState().notifyAsked).toBe(true)
    })
  })

  describe('saveSettings (AC11, AC12, AC13)', () => {
    const valid: Settings = {
      focusMin: 30,
      shortMin: 10,
      longMin: 20,
      autoStart: false,
      soundOn: false,
    }

    it('returns true and replaces all fields incl. toggles', () => {
      const store = createTimerStore(memory())
      expect(store.getState().saveSettings(valid)).toBe(true)
      expect(store.getState().settings).toEqual(valid)
    })

    it.each([
      ['focus 0', { focusMin: 0 }],
      ['focus 121', { focusMin: 121 }],
      ['short 31', { shortMin: 31 }],
      ['long 61', { longMin: 61 }],
      ['fractional', { shortMin: 2.5 }],
      ['NaN', { longMin: NaN }],
    ])('rejects %s: returns false and writes nothing', (_n, patch) => {
      const storage = memory()
      const store = createTimerStore(storage)
      store.getState().saveSettings({ ...DEFAULT_SETTINGS, focusMin: 25 })
      const before = storage.data.get(STORAGE_KEY)
      const stateBefore = store.getState()
      expect(store.getState().saveSettings({ ...valid, ...patch })).toBe(false)
      expect(store.getState().settings).toBe(stateBefore.settings)
      expect(store.getState().timer).toBe(stateBefore.timer)
      expect(storage.data.get(STORAGE_KEY)).toBe(before)
    })

    it('idle: reloads the current phase at the new length (AC11)', () => {
      const store = createTimerStore(memory())
      store.getState().saveSettings(valid)
      expect(store.getState().timer).toMatchObject({
        status: 'idle',
        remainingMs: 30 * MIN,
        durationMs: 30 * MIN,
      })
    })

    it('running: the started phase is untouched, the next one uses the new length (AC13)', () => {
      const store = createTimerStore(memory())
      store.getState().start()
      const running = store.getState().timer
      store.getState().saveSettings(valid)
      expect(store.getState().timer).toBe(running)
      vi.advanceTimersByTime(25 * MIN)
      store.getState().sync('live')
      expect(store.getState().timer).toMatchObject({ phase: 'short', durationMs: 10 * MIN })
    })

    it('paused: the timer is untouched', () => {
      const store = createTimerStore(memory())
      store.getState().start()
      vi.advanceTimersByTime(5_000)
      store.getState().pause()
      const paused = store.getState().timer
      store.getState().saveSettings(valid)
      expect(store.getState().timer).toBe(paused)
    })
  })

  describe('lastEnd caption lifecycle', () => {
    const end = { phaseId: 0, ended: 'focus', next: 'short', away: false } as const

    it('Reset clears lastEnd even when the timer is a no-op on a fresh idle phase (R-04)', () => {
      const store = createTimerStore(memory())
      store.setState({ lastEnd: end })
      const timer = store.getState().timer
      store.getState().reset()
      expect(store.getState().timer).toBe(timer)
      expect(store.getState().lastEnd).toBeNull()
    })

    it('Start clears lastEnd', () => {
      const store = createTimerStore(memory())
      store.setState({ lastEnd: end })
      store.getState().start()
      expect(store.getState().lastEnd).toBeNull()
    })

    it('the caption stays through a no-op Pause', () => {
      const store = createTimerStore(memory())
      store.setState({ lastEnd: end })
      store.getState().pause()
      expect(store.getState().lastEnd).toEqual(end)
    })
  })

  it('markNotifyAsked sets the flag', () => {
    const store = createTimerStore(memory())
    expect(store.getState().notifyAsked).toBe(false)
    store.getState().markNotifyAsked()
    expect(store.getState().notifyAsked).toBe(true)
  })
})

function stringStorage(raw: string): Storage {
  return {
    getItem: () => raw,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  }
}
