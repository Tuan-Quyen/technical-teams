import { describe, expect, it } from 'vitest'
import { captionFor, formatClock, notificationTitleFor, titleFor } from './format.ts'
import { DEFAULT_SETTINGS } from './settings.ts'
import { initialTimer } from './timer.ts'

describe('formatClock', () => {
  it.each([
    [25 * 60_000, '25:00'],
    [25 * 60_000 - 1, '25:00'],
    [25 * 60_000 - 1_000, '24:59'],
    [61_000, '01:01'],
    [1, '00:01'],
    [0, '00:00'],
    [-5_000, '00:00'],
    [120 * 60_000, '120:00'],
  ])('%i ms -> %s', (ms, text) => {
    expect(formatClock(ms)).toBe(text)
  })
})

describe('titleFor (POMO-E12)', () => {
  const idle = initialTimer(DEFAULT_SETTINGS)
  it('is "Pomodoro" when idle', () => {
    expect(titleFor(idle, idle.remainingMs)).toBe('Pomodoro')
  })
  it('shows time and phase while running or paused', () => {
    const running = { ...idle, status: 'running' as const }
    expect(titleFor(running, 12 * 60_000 + 34_000)).toBe('12:34 · Focus — Pomodoro')
    const paused = { ...idle, status: 'paused' as const, phase: 'long' as const }
    expect(titleFor(paused, 60_000)).toBe('01:00 · Long Break — Pomodoro')
  })
})

describe('captionFor', () => {
  const idle = initialTimer(DEFAULT_SETTINGS)
  const end = { phaseId: 0, ended: 'focus', next: 'short', away: false } as const

  it('is "Paused" while paused, even with a stale lastEnd', () => {
    expect(captionFor({ ...idle, status: 'paused' }, null)).toBe('Paused')
    expect(captionFor({ ...idle, status: 'paused' }, end)).toBe('Paused')
  })
  it('names the finished phase when idle after a natural end', () => {
    expect(captionFor(idle, end)).toBe('Focus finished')
    expect(captionFor(idle, { ...end, ended: 'short', next: 'focus' })).toBe('Short Break finished')
    expect(captionFor(idle, { ...end, ended: 'long', next: 'focus' })).toBe('Long Break finished')
  })
  it('adds the away suffix for a missed end (POMO-AC21)', () => {
    expect(captionFor(idle, { ...end, away: true })).toBe('Focus finished while you were away')
  })
  it('is empty when idle with no end, and while running', () => {
    expect(captionFor(idle, null)).toBe('')
    expect(captionFor({ ...idle, status: 'running' }, end)).toBe('')
  })
})

describe('notificationTitleFor (POMO-AC14)', () => {
  it.each([
    ['focus', 'short', 'Focus finished — Short Break next'],
    ['focus', 'long', 'Focus finished — Long Break next'],
    ['short', 'focus', 'Short Break finished — Focus next'],
    ['long', 'focus', 'Long Break finished — Focus next'],
  ] as const)('%s then %s', (ended, next, title) => {
    expect(notificationTitleFor({ phaseId: 1, ended, next, away: false })).toBe(title)
  })
})
