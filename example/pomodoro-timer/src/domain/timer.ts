import { CYCLE, phaseDurationMs } from './settings.ts'
import type { CompleteMode, Phase, Settings, Timer, TimerResult } from './types.ts'

/** An end handled later than this (sleep, heavy throttling) leaves the next phase idle. */
export const AWAY_MS = 90_000
/** Minimum gap between Skip transitions (POMO-E3). */
export const SKIP_DEBOUNCE_MS = 300

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function initialTimer(s: Settings): Timer {
  const durationMs = phaseDurationMs('focus', s)
  return {
    phase: 'focus',
    status: 'idle',
    endAt: null,
    remainingMs: durationMs,
    durationMs,
    completed: 0,
    phaseId: 0,
  }
}

/** Idle at the full settings duration: Reset has nothing to do (POMO-E9). */
export function isFresh(t: Timer, s: Settings): boolean {
  return t.status === 'idle' && t.remainingMs === phaseDurationMs(t.phase, s)
}

export function remaining(t: Timer, now: number): number {
  if (t.status === 'running' && t.endAt !== null) return clamp(t.endAt - now, 0, t.durationMs)
  return t.remainingMs
}

export function progress(t: Timer, now: number): number {
  if (t.durationMs <= 0) return 0
  return clamp(1 - remaining(t, now) / t.durationMs, 0, 1)
}

export function nextPhase(
  phase: Phase,
  completed: number,
  counted: boolean,
): { phase: Phase; completed: number } {
  if (phase === 'focus') {
    if (!counted) return { phase: 'short', completed }
    const next = Math.min(completed + 1, CYCLE)
    return { phase: next >= CYCLE ? 'long' : 'short', completed: next }
  }
  if (phase === 'short') return { phase: 'focus', completed }
  return { phase: 'focus', completed: 0 }
}

export function start(t: Timer, now: number): TimerResult {
  if (t.status === 'running') return { timer: t }
  return { timer: { ...t, status: 'running', endAt: now + t.remainingMs } }
}

export function pause(t: Timer, now: number): TimerResult {
  if (t.status !== 'running') return { timer: t }
  return {
    timer: { ...t, status: 'paused', remainingMs: remaining(t, now), endAt: null },
  }
}

export function reset(t: Timer, s: Settings): TimerResult {
  if (isFresh(t, s)) return { timer: t }
  const durationMs = phaseDurationMs(t.phase, s)
  return {
    timer: { ...t, status: 'idle', endAt: null, remainingMs: durationMs, durationMs },
  }
}

/** Loads the next phase at full settings duration, running from `now` or idle; bumps `phaseId`. */
function loadPhase(
  t: Timer,
  next: { phase: Phase; completed: number },
  s: Settings,
  now: number,
  run: boolean,
): Timer {
  const durationMs = phaseDurationMs(next.phase, s)
  return {
    phase: next.phase,
    status: run ? 'running' : 'idle',
    endAt: run ? now + durationMs : null,
    remainingMs: durationMs,
    durationMs,
    completed: next.completed,
    phaseId: t.phaseId + 1,
  }
}

export function skip(t: Timer, s: Settings, now: number, lastTransitionAt: number): TimerResult {
  if (now - lastTransitionAt < SKIP_DEBOUNCE_MS) return { timer: t }
  const next = nextPhase(t.phase, t.completed, false)
  return { timer: loadPhase(t, next, s, now, s.autoStart) }
}

export function complete(t: Timer, s: Settings, now: number, mode: CompleteMode): TimerResult {
  if (t.status !== 'running' || t.endAt === null || now < t.endAt) return { timer: t }
  const away = mode === 'load' || now - t.endAt > AWAY_MS
  const next = nextPhase(t.phase, t.completed, true)
  const timer = loadPhase(t, next, s, now, s.autoStart && !away)
  return {
    timer,
    end: { phaseId: t.phaseId, ended: t.phase, next: next.phase, away },
  }
}
