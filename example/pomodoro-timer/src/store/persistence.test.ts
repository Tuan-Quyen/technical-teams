import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import {
  MAX_DURATION_MS,
  STORAGE_KEY,
  createSafeStorage,
  merge,
  migrate,
  parsePersisted,
  parseSettings,
  parseTimer,
  partialize,
  probeStorage,
  type Persisted,
} from './persistence.ts'

const MIN = 60_000
const fresh: Persisted = {
  settings: DEFAULT_SETTINGS,
  timer: initialTimer(DEFAULT_SETTINGS),
  notifyAsked: false,
}

/** Storage whose every method throws, like a blocked or full `localStorage`. */
function throwingStorage(): Storage {
  const boom = () => {
    throw new DOMException('blocked', 'SecurityError')
  }
  return {
    getItem: boom,
    setItem: boom,
    removeItem: boom,
    clear: boom,
    key: boom,
    length: 0,
  }
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
    removeItem: (k) => {
      data.delete(k)
    },
    clear: () => {
      data.clear()
    },
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  }
}

describe('createSafeStorage (POMO-E2)', () => {
  it('reads valid JSON back as the stored string', () => {
    const s = createSafeStorage(() => memoryStorage({ k: '{"a":1}' }))
    expect(s.getItem('k')).toBe('{"a":1}')
  })
  it('returns null for corrupt JSON and for a missing key', () => {
    expect(createSafeStorage(() => memoryStorage({ k: '{oops' })).getItem('k')).toBeNull()
    expect(createSafeStorage(() => memoryStorage()).getItem('k')).toBeNull()
  })
  it('never throws when storage throws', () => {
    const s = createSafeStorage(() => throwingStorage())
    expect(s.getItem('k')).toBeNull()
    expect(() => {
      s.setItem('k', '1')
      s.removeItem('k')
    }).not.toThrow()
  })
  it('never throws when storage is missing or the accessor throws', () => {
    const missing = createSafeStorage(() => null)
    expect(missing.getItem('k')).toBeNull()
    expect(() => {
      missing.setItem('k', '1')
    }).not.toThrow()
    const accessor = createSafeStorage(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    expect(accessor.getItem('k')).toBeNull()
  })
  it('writes and removes through to the backing store', () => {
    const backing = memoryStorage()
    const s = createSafeStorage(() => backing)
    s.setItem('k', '"x"')
    expect(backing.getItem('k')).toBe('"x"')
    s.removeItem('k')
    expect(backing.getItem('k')).toBeNull()
  })
})

describe('probeStorage (POMO-AC26)', () => {
  it('is true for working storage and leaves no probe key behind', () => {
    const backing = memoryStorage()
    expect(probeStorage(() => backing)).toBe(true)
    expect(backing.length).toBe(0)
  })
  it('is false when storage throws or is missing', () => {
    expect(probeStorage(() => throwingStorage())).toBe(false)
    expect(probeStorage(() => null)).toBe(false)
    expect(
      probeStorage(() => {
        throw new Error('denied')
      }),
    ).toBe(false)
  })
})

describe('parseSettings (POMO-E10)', () => {
  it('keeps valid values', () => {
    const s = { focusMin: 30, shortMin: 10, longMin: 20, autoStart: false, soundOn: false }
    expect(parseSettings(s)).toEqual(s)
  })
  it.each([-5, 0, 121, 1.5, NaN, '25', null])('falls back from focusMin %s to the default', (v) => {
    expect(parseSettings({ ...DEFAULT_SETTINGS, focusMin: v }).focusMin).toBe(25)
  })
  it('falls back per field and ignores wrong types', () => {
    const out = parseSettings({
      focusMin: 40,
      shortMin: 99,
      longMin: 'x',
      autoStart: 'no',
      soundOn: 1,
    })
    expect(out).toEqual({ ...DEFAULT_SETTINGS, focusMin: 40 })
  })
  it('handles non-objects', () => {
    for (const v of [null, undefined, 5, 'x', [], true]) {
      expect(parseSettings(v)).toEqual(DEFAULT_SETTINGS)
    }
  })
})

describe('parseTimer', () => {
  const ok = { ...fresh.timer }
  it('accepts a valid idle, paused and running timer', () => {
    expect(parseTimer(ok)).toEqual(ok)
    expect(parseTimer({ ...ok, status: 'paused', remainingMs: 5 * MIN })).not.toBeNull()
    expect(parseTimer({ ...ok, status: 'running', endAt: 123 })).not.toBeNull()
  })
  it.each([
    ['unknown phase', { phase: 'nap' }],
    ['unknown status', { status: 'done' }],
    ['running without endAt', { status: 'running', endAt: null }],
    ['idle with endAt', { endAt: 5 }],
    ['non-finite endAt', { status: 'running', endAt: Infinity }],
    ['negative remaining', { remainingMs: -1 }],
    ['remaining above duration', { remainingMs: 26 * MIN }],
    ['zero duration', { durationMs: 0, remainingMs: 0 }],
    ['NaN duration', { durationMs: NaN }],
    ['completed 5', { completed: 5 }],
    ['completed -1', { completed: -1 }],
    ['fractional completed', { completed: 1.5 }],
    ['negative phaseId', { phaseId: -1 }],
    ['string remaining', { remainingMs: '5' }],
  ])('rejects %s', (_name, patch) => {
    expect(parseTimer({ ...ok, ...patch })).toBeNull()
  })
  it('rejects non-objects', () => {
    for (const v of [null, undefined, 1, 'x', []]) expect(parseTimer(v)).toBeNull()
  })
})

describe('parseTimer bounds (POMO-S1, POMO-S2, POMO-S3)', () => {
  const NOW = 5_000_000
  const running = { ...fresh.timer, status: 'running' as const, endAt: NOW + 25 * MIN }

  it('accepts a running timer ending within one phase of now', () => {
    expect(parseTimer(running, NOW)).not.toBeNull()
    expect(parseTimer({ ...running, endAt: NOW + 25 * MIN + 60_000 }, NOW)).not.toBeNull()
  })
  it('accepts an overdue running timer (restoreOnLoad handles it)', () => {
    expect(parseTimer({ ...running, endAt: NOW - 3 * MIN }, NOW)).not.toBeNull()
  })
  it.each([2 ** 31, 2 ** 40, 1e15, Number.MAX_SAFE_INTEGER])(
    'rejects a running endAt %s ms ahead',
    (ahead) => {
      expect(parseTimer({ ...running, endAt: NOW + ahead }, NOW)).toBeNull()
    },
  )
  it('rejects an endAt just past one phase plus slack', () => {
    expect(parseTimer({ ...running, endAt: NOW + 25 * MIN + 60_001 }, NOW)).toBeNull()
  })
  it('caps durationMs at the longest phase (120 min)', () => {
    const at = (d: number) => ({ ...fresh.timer, durationMs: d, remainingMs: d })
    expect(parseTimer(at(MAX_DURATION_MS), NOW)).not.toBeNull()
    expect(parseTimer(at(MAX_DURATION_MS + 1), NOW)).toBeNull()
    expect(parseTimer(at(1e305), NOW)).toBeNull()
  })
  it('a huge idle duration cannot reach the clock: it becomes a fresh Focus (POMO-S2)', () => {
    const out = parsePersisted(
      { timer: { ...fresh.timer, durationMs: 1e305, remainingMs: 1e305 } },
      DEFAULT_SETTINGS,
      NOW,
    )
    expect(out.timer).toEqual(initialTimer(DEFAULT_SETTINGS))
  })
  it('a tampered running endAt becomes a fresh Focus from the merged settings', () => {
    const out = parsePersisted(
      { settings: { focusMin: 40 }, timer: { ...running, endAt: NOW + 2 ** 40 } },
      DEFAULT_SETTINGS,
      NOW,
    )
    expect(out.timer).toMatchObject({ status: 'idle', endAt: null, durationMs: 40 * MIN })
  })
  it.each([2 ** 53, 2 ** 53 + 2, Number.MAX_VALUE, 1e300])('rejects unsafe phaseId %s', (id) => {
    expect(parseTimer({ ...fresh.timer, phaseId: id }, NOW)).toBeNull()
  })
  it('accepts the largest safe phaseId', () => {
    expect(parseTimer({ ...fresh.timer, phaseId: Number.MAX_SAFE_INTEGER }, NOW)).not.toBeNull()
  })
})

describe('parsePersisted / merge', () => {
  it('uses a fresh Focus timer built from the merged settings when the timer is invalid', () => {
    const out = parsePersisted({ settings: { focusMin: 40 }, timer: { phase: 'bad' } })
    expect(out.settings.focusMin).toBe(40)
    expect(out.timer).toEqual(initialTimer(out.settings))
    expect(out.timer.durationMs).toBe(40 * MIN)
  })
  it('notifyAsked is true only for boolean true', () => {
    expect(parsePersisted({ notifyAsked: true }).notifyAsked).toBe(true)
    for (const v of ['true', 1, null, undefined]) {
      expect(parsePersisted({ notifyAsked: v }).notifyAsked).toBe(false)
    }
  })
  it('merge keeps non-persisted fields of the current state', () => {
    const current = { ...fresh, lastEnd: null, extra: 1 }
    const out = merge({ settings: { focusMin: 50 } }, current)
    expect(out.extra).toBe(1)
    expect(out.settings.focusMin).toBe(50)
  })
  it('merge survives garbage input', () => {
    for (const v of [undefined, null, 7, 'x', [], { timer: 5 }]) {
      expect(merge(v, fresh).settings).toEqual(DEFAULT_SETTINGS)
    }
  })
})

describe('partialize / migrate / key', () => {
  it('persists settings, timer and notifyAsked only', () => {
    const state = { ...fresh, lastEnd: null, lastTransitionAt: 9 }
    const out = partialize(state)
    expect(Object.keys(out).sort()).toEqual(['notifyAsked', 'settings', 'timer'])
  })
  it('migrate passes state through', () => {
    expect(migrate(fresh)).toBe(fresh)
  })
  it('uses the single agreed key', () => {
    expect(STORAGE_KEY).toBe('pomodoro-timer')
  })
})
