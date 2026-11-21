import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './settings.ts'
import {
  AWAY_MS,
  SKIP_DEBOUNCE_MS,
  clamp,
  complete,
  initialTimer,
  isFresh,
  nextPhase,
  pause,
  progress,
  remaining,
  reset,
  skip,
  start,
} from './timer.ts'
import type { Settings, Timer } from './types.ts'

const MIN = 60_000
const s: Settings = DEFAULT_SETTINGS
const T0 = 1_000_000
const fresh = initialTimer(s)

function running(over: Partial<Timer> = {}, at = T0): Timer {
  const base = start({ ...fresh, ...over }, at).timer
  return base
}

describe('clamp', () => {
  it('bounds the value', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })
})

describe('initialTimer / isFresh (POMO-AC1)', () => {
  it('starts idle in Focus 25:00, 0 of 4', () => {
    expect(fresh).toEqual({
      phase: 'focus',
      status: 'idle',
      endAt: null,
      remainingMs: 25 * MIN,
      durationMs: 25 * MIN,
      completed: 0,
      phaseId: 0,
    })
    expect(isFresh(fresh, s)).toBe(true)
  })
  it('is not fresh once paused or changed', () => {
    expect(isFresh({ ...fresh, remainingMs: 1 }, s)).toBe(false)
    expect(isFresh({ ...fresh, status: 'paused' }, s)).toBe(false)
  })
})

describe('remaining / progress (POMO-E1)', () => {
  it('derives remaining from endAt', () => {
    const t = running()
    expect(remaining(t, T0 + 10_000)).toBe(25 * MIN - 10_000)
    expect(progress(t, T0 + 25 * MIN * 0.5)).toBeCloseTo(0.5)
  })
  it('clamps when the clock jumps backwards or forwards', () => {
    const t = running()
    expect(remaining(t, T0 - 10 * MIN)).toBe(25 * MIN)
    expect(remaining(t, T0 + 99 * MIN)).toBe(0)
    expect(progress(t, T0 - 10 * MIN)).toBe(0)
    expect(progress(t, T0 + 99 * MIN)).toBe(1)
  })
  it('returns remainingMs when not running', () => {
    expect(remaining({ ...fresh, status: 'paused', remainingMs: 5_000 }, T0)).toBe(5_000)
  })
})

describe('nextPhase', () => {
  it.each([
    ['focus', 0, true, 'short', 1],
    ['focus', 1, true, 'short', 2],
    ['focus', 2, true, 'short', 3],
    ['focus', 3, true, 'long', 4],
    ['focus', 0, false, 'short', 0],
    ['focus', 3, false, 'short', 3],
    ['short', 2, true, 'focus', 2],
    ['short', 2, false, 'focus', 2],
    ['long', 4, true, 'focus', 0],
    ['long', 4, false, 'focus', 0],
  ] as const)('%s with %i done, counted=%s -> %s, %i', (phase, completed, counted, next, done) => {
    expect(nextPhase(phase, completed, counted)).toEqual({ phase: next, completed: done })
  })
})

describe('start (POMO-AC2, POMO-AC4, POMO-E3)', () => {
  it('idle -> running with endAt = now + remainingMs', () => {
    const t = start(fresh, T0).timer
    expect(t.status).toBe('running')
    expect(t.endAt).toBe(T0 + 25 * MIN)
  })
  it('paused -> running continues from the paused remaining', () => {
    const paused: Timer = { ...fresh, status: 'paused', remainingMs: 12 * MIN }
    expect(start(paused, T0).timer.endAt).toBe(T0 + 12 * MIN)
  })
  it('running -> no-op, same object', () => {
    const t = running()
    expect(start(t, T0 + 5_000).timer).toBe(t)
  })
})

describe('pause (POMO-AC3)', () => {
  it('running -> paused, freezes remaining, clears endAt', () => {
    const t = pause(running(), T0 + 10_000).timer
    expect(t).toMatchObject({ status: 'paused', endAt: null, remainingMs: 25 * MIN - 10_000 })
  })
  it('idle / paused -> no-op', () => {
    expect(pause(fresh, T0).timer).toBe(fresh)
    const paused: Timer = { ...fresh, status: 'paused', remainingMs: 1_000 }
    expect(pause(paused, T0).timer).toBe(paused)
  })
  it('keeps remaining within bounds if the clock jumped', () => {
    expect(pause(running(), T0 + 99 * MIN).timer.remainingMs).toBe(0)
  })
})

describe('reset (POMO-AC5, POMO-E9)', () => {
  it.each(['running', 'paused'] as const)(
    '%s -> idle at full duration, completed kept',
    (status) => {
      const t: Timer = { ...running({ completed: 2, remainingMs: 12 * MIN }), status }
      const out = reset(t, s).timer
      expect(out).toMatchObject({
        status: 'idle',
        endAt: null,
        remainingMs: 25 * MIN,
        durationMs: 25 * MIN,
        completed: 2,
        phase: 'focus',
        phaseId: t.phaseId,
      })
    },
  )
  it('does not leave the current phase', () => {
    const t: Timer = { ...fresh, phase: 'short', remainingMs: 100, durationMs: 5 * MIN }
    expect(reset(t, s).timer.phase).toBe('short')
  })
  it('is a no-op on a fresh phase', () => {
    expect(reset(fresh, s).timer).toBe(fresh)
  })
  it('picks up changed settings for the current phase when idle', () => {
    const out = reset(fresh, { ...s, focusMin: 30 }).timer
    expect(out.durationMs).toBe(30 * MIN)
    expect(out.remainingMs).toBe(30 * MIN)
  })
})

describe('skip (POMO-AC6, POMO-E3, POMO-E8, POMO-E9)', () => {
  const long = T0 - 10_000
  it('Focus -> Short, not counted, running with Auto-start', () => {
    const out = skip(running({ completed: 1 }), s, T0 + 5_000, long).timer
    expect(out).toMatchObject({
      phase: 'short',
      completed: 1,
      status: 'running',
      remainingMs: 5 * MIN,
      durationMs: 5 * MIN,
      endAt: T0 + 5_000 + 5 * MIN,
      phaseId: 1,
    })
  })
  it('waits idle when Auto-start is off', () => {
    const out = skip(running(), { ...s, autoStart: false }, T0, long).timer
    expect(out).toMatchObject({ phase: 'short', status: 'idle', endAt: null })
  })
  it('Skip on the 4th Focus does not count it and goes to Short Break', () => {
    const out = skip(running({ completed: 3 }), s, T0, long).timer
    expect(out).toMatchObject({ phase: 'short', completed: 3 })
  })
  it('Short -> Focus, completed kept', () => {
    const t = { ...running({ phase: 'short', completed: 2, durationMs: 5 * MIN }) }
    expect(skip(t, s, T0, long).timer).toMatchObject({ phase: 'focus', completed: 2 })
  })
  it('Long -> Focus, completed resets to 0 (POMO-E8)', () => {
    const t = running({ phase: 'long', completed: 4, durationMs: 15 * MIN })
    expect(skip(t, s, T0, long).timer).toMatchObject({ phase: 'focus', completed: 0 })
  })
  it('works while idle and while paused (POMO-E9)', () => {
    expect(skip(fresh, s, T0, long).timer.phase).toBe('short')
    const paused: Timer = { ...fresh, status: 'paused', remainingMs: 1_000 }
    expect(skip(paused, s, T0, long).timer.phase).toBe('short')
  })
  it('emits no PhaseEnd', () => {
    expect(skip(running(), s, T0, long).end).toBeUndefined()
  })
  it('is ignored inside the debounce window, allowed at its edge (POMO-E3)', () => {
    const t = running()
    expect(skip(t, s, T0 + SKIP_DEBOUNCE_MS - 1, T0).timer).toBe(t)
    expect(skip(t, s, T0 + SKIP_DEBOUNCE_MS, T0).timer.phase).toBe('short')
  })
  it('uses the new duration settings for the next phase', () => {
    expect(skip(running(), { ...s, shortMin: 7 }, T0, long).timer.durationMs).toBe(7 * MIN)
  })
})

describe('complete (POMO-AC8-POMO-AC10, POMO-AC21, POMO-E3)', () => {
  const t = running()
  const endAt = T0 + 25 * MIN

  it('is a no-op before endAt', () => {
    expect(complete(t, s, endAt - 1, 'live').timer).toBe(t)
  })
  it.each(['idle', 'paused'] as const)('is a no-op when %s (POMO-E4)', (status) => {
    const x: Timer = { ...fresh, status }
    const out = complete(x, s, endAt + MIN, 'live')
    expect(out.timer).toBe(x)
    expect(out.end).toBeUndefined()
  })
  it('on time with Auto-start: counts the Focus, next phase runs from now', () => {
    const out = complete(t, s, endAt, 'live')
    expect(out.timer).toMatchObject({
      phase: 'short',
      completed: 1,
      status: 'running',
      endAt: endAt + 5 * MIN,
      phaseId: 1,
      remainingMs: 5 * MIN,
    })
    expect(out.end).toEqual({ phaseId: 0, ended: 'focus', next: 'short', away: false })
  })
  it('Auto-start off: next phase idle at full duration', () => {
    const out = complete(t, { ...s, autoStart: false }, endAt, 'live')
    expect(out.timer).toMatchObject({ phase: 'short', status: 'idle', endAt: null })
    expect(out.end?.away).toBe(false)
  })
  it('4th Focus -> Long Break, 4 of 4', () => {
    const x = running({ completed: 3 })
    const out = complete(x, s, endAt, 'live')
    expect(out.timer).toMatchObject({ phase: 'long', completed: 4, durationMs: 15 * MIN })
    expect(out.end?.next).toBe('long')
  })
  it('Long Break end -> Focus, counter 0', () => {
    const x = running({ phase: 'long', completed: 4, durationMs: 15 * MIN, remainingMs: 15 * MIN })
    const out = complete(x, s, T0 + 15 * MIN, 'live')
    expect(out.timer).toMatchObject({ phase: 'focus', completed: 0 })
    expect(out.end).toMatchObject({ ended: 'long', next: 'focus' })
  })
  it('Short Break end -> Focus, completed kept', () => {
    const x = running({ phase: 'short', completed: 2, durationMs: 5 * MIN, remainingMs: 5 * MIN })
    expect(complete(x, s, T0 + 5 * MIN, 'live').timer).toMatchObject({
      phase: 'focus',
      completed: 2,
    })
  })
  it('away boundary: exactly AWAY_MS late still auto-starts, +1 ms goes idle (POMO-AC10)', () => {
    expect(AWAY_MS).toBe(90_000)
    const ok = complete(t, s, endAt + AWAY_MS, 'live')
    expect(ok.timer.status).toBe('running')
    expect(ok.timer.endAt).toBe(endAt + AWAY_MS + 5 * MIN)
    expect(ok.end?.away).toBe(false)
    const late = complete(t, s, endAt + AWAY_MS + 1, 'live')
    expect(late.timer).toMatchObject({ status: 'idle', endAt: null, remainingMs: 5 * MIN })
    expect(late.end?.away).toBe(true)
  })
  it('load mode is always idle with away, even on time (POMO-AC21)', () => {
    const out = complete(t, s, endAt + 1_000, 'load')
    expect(out.timer.status).toBe('idle')
    expect(out.end?.away).toBe(true)
  })
  it('does one transition only, no multi-phase catch-up', () => {
    const out = complete(t, s, endAt + 10 * MIN, 'load')
    expect(out.timer).toMatchObject({ phase: 'short', phaseId: 1, completed: 1 })
  })
  it('is not applied twice to the same phase (POMO-E3)', () => {
    const first = complete(t, { ...s, autoStart: false }, endAt, 'live')
    const second = complete(first.timer, s, endAt, 'live')
    expect(second.timer).toBe(first.timer)
    expect(second.end).toBeUndefined()
  })
})

describe('durationMs snapshot (POMO-AC13)', () => {
  it('a settings change does not alter a started phase', () => {
    const t = running()
    const changed = { ...s, focusMin: 30 }
    expect(remaining(t, T0)).toBe(25 * MIN)
    expect(pause(t, T0 + 1_000).timer.durationMs).toBe(25 * MIN)
    // applies from the next Focus
    const afterBreak = complete(
      complete(t, changed, T0 + 25 * MIN, 'live').timer,
      changed,
      T0 + 30 * MIN,
      'live',
    ).timer
    expect(afterBreak).toMatchObject({ phase: 'focus', durationMs: 30 * MIN })
  })
})
