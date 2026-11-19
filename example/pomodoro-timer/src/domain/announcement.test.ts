import { describe, expect, it } from 'vitest'
import { announcementFor, type Snapshot } from './format.ts'
import { DEFAULT_SETTINGS } from './settings.ts'
import { complete, initialTimer, pause, reset, skip, start } from './timer.ts'
import type { PhaseEnd, Timer } from './types.ts'

const S = DEFAULT_SETTINGS
const T0 = 1_000_000
const snap = (timer: Timer, lastEnd: PhaseEnd | null = null, lastTransitionAt = 0): Snapshot => ({
  timer,
  lastEnd,
  lastTransitionAt,
})
const idle = snap(initialTimer(S))
const running = snap(start(initialTimer(S), T0).timer)

describe('announcementFor', () => {
  it('says nothing for a tick or an unchanged state', () => {
    expect(announcementFor(running, running)).toBeNull()
    expect(announcementFor(idle, idle)).toBeNull()
  })

  it('start, resume, pause and reset', () => {
    expect(announcementFor(idle, running)).toBe('Focus started, 25 minutes')
    const paused = snap(pause(running.timer, T0 + 300_000).timer)
    expect(announcementFor(running, paused)).toBe('Paused at 20:00')
    expect(announcementFor(paused, snap(start(paused.timer, T0 + 400_000).timer))).toBe('Resumed')
    expect(announcementFor(paused, snap(reset(paused.timer, S).timer))).toBe('Focus reset to 25:00')
  })

  it('says "1 minute" in the singular', () => {
    const one = { ...S, focusMin: 1 }
    const before = snap(initialTimer(one))
    const after = snap(start(before.timer, T0).timer)
    expect(announcementFor(before, after)).toBe('Focus started, 1 minute')
  })

  it('skip, with and without Auto-start', () => {
    const off = { ...S, autoStart: false }
    expect(announcementFor(idle, snap(skip(idle.timer, off, T0, 0).timer, null, T0))).toBe(
      'Skipped to Short Break',
    )
    expect(announcementFor(idle, snap(skip(idle.timer, S, T0, 0).timer, null, T0))).toBe(
      'Skipped to Short Break — started',
    )
  })

  it('natural phase end: Auto-start on, off, the fourth session, and away', () => {
    const endAt = running.timer.endAt ?? 0
    const on = complete(running.timer, S, endAt, 'live')
    expect(announcementFor(running, snap(on.timer, on.end ?? null))).toBe(
      'Focus finished. Short Break started.',
    )
    const off = complete(running.timer, { ...S, autoStart: false }, endAt, 'live')
    expect(announcementFor(running, snap(off.timer, off.end ?? null))).toBe(
      'Focus finished. Short Break is ready. Press Start to begin.',
    )
    const fourth = snap({ ...running.timer, completed: 3 })
    const last = complete(fourth.timer, S, endAt, 'live')
    expect(announcementFor(fourth, snap(last.timer, last.end ?? null))).toBe(
      'Focus finished. 4 of 4 sessions done. Long Break started.',
    )
    const away = complete(running.timer, S, endAt + 10 * 60_000, 'load')
    expect(announcementFor(running, snap(away.timer, away.end ?? null))).toBe(
      'Focus finished while you were away. Short Break is ready.',
    )
  })

  it('uses neutral copy for a phase adopted from another tab (R-15)', () => {
    // Same lastTransitionAt: this tab did not make the transition.
    const idleNext = skip(idle.timer, { ...S, autoStart: false }, T0, 0).timer
    expect(announcementFor(idle, snap(idleNext))).toBe('Short Break is ready.')
    const runningNext = skip(idle.timer, S, T0, 0).timer
    expect(announcementFor(idle, snap(runningNext))).toBe('Short Break started.')
    const afterEnd = complete(running.timer, S, running.timer.endAt ?? 0, 'live').timer
    expect(announcementFor(running, snap(afterEnd))).toBe('Short Break started.')
  })
})
