import { CYCLE } from './settings.ts'
import { clamp } from './timer.ts'
import type { Phase, PhaseEnd, Timer } from './types.ts'

export const PHASE_LABEL: Record<Phase, string> = {
  focus: 'Focus',
  short: 'Short Break',
  long: 'Long Break',
}

/** `MM:SS`, or `MMM:SS` from 100 min up. Rounds up, so a fresh 25:00 reads 24:59 after one second. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** Document title: `12:34 · Focus — Pomodoro` while running or paused, `Pomodoro` when idle. */
export function titleFor(t: Timer, remainingMs: number): string {
  if (t.status === 'idle') return 'Pomodoro'
  return `${formatClock(clamp(remainingMs, 0, t.durationMs))} · ${PHASE_LABEL[t.phase]} — Pomodoro`
}

/** Caption under the digits: "Paused", or the finished phase while idle after a natural end. */
export function captionFor(t: Timer, lastEnd: PhaseEnd | null): string {
  if (t.status === 'paused') return 'Paused'
  if (t.status === 'idle' && lastEnd) {
    const away = lastEnd.away ? ' while you were away' : ''
    return `${PHASE_LABEL[lastEnd.ended]} finished${away}`
  }
  return ''
}

/** Notification title: "Focus finished — Short Break next". Built from phase names only. */
export function notificationTitleFor(end: PhaseEnd): string {
  return `${PHASE_LABEL[end.ended]} finished — ${PHASE_LABEL[end.next]} next`
}

/** What the live region needs to compare two store states. */
export interface Snapshot {
  timer: Timer
  lastEnd: PhaseEnd | null
  /** Set by this tab's own transitions (skip, end) and not by a state adopted from another tab. */
  lastTransitionAt: number
}

const minutesOf = (ms: number) => {
  const n = Math.round(ms / 60_000)
  return `${String(n)} minute${n === 1 ? '' : 's'}`
}

/**
 * Live-region text for a state change, or `null` when nothing should be said. Only transitions
 * speak (start, resume, pause, reset, skip, phase end); a tick never changes the result, so the
 * digits are not announced each second.
 */
export function announcementFor(prev: Snapshot, next: Snapshot): string | null {
  const a = prev.timer
  const b = next.timer
  const nextName = PHASE_LABEL[b.phase]

  if (b.phaseId !== a.phaseId) {
    const end = next.lastEnd
    if (end && end !== prev.lastEnd) {
      const ended = PHASE_LABEL[end.ended]
      if (end.away) return `${ended} finished while you were away. ${nextName} is ready.`
      if (b.status === 'running') {
        return end.ended === 'focus' && b.completed >= CYCLE
          ? `${ended} finished. ${String(CYCLE)} of ${String(CYCLE)} sessions done. ${nextName} started.`
          : `${ended} finished. ${nextName} started.`
      }
      return `${ended} finished. ${nextName} is ready. Press Start to begin.`
    }
    // This tab's Skip stamps `lastTransitionAt`; a phase adopted from another tab (storage
    // rehydrate) does not, and its cause is unknown, so it gets neutral copy.
    if (next.lastTransitionAt === prev.lastTransitionAt)
      return b.status === 'running' ? `${nextName} started.` : `${nextName} is ready.`
    return `Skipped to ${nextName}${b.status === 'running' ? ' — started' : ''}`
  }

  if (a.status === 'idle' && b.status === 'running') {
    return `${nextName} started, ${minutesOf(b.durationMs)}`
  }
  if (a.status === 'paused' && b.status === 'running') return 'Resumed'
  if (a.status === 'running' && b.status === 'paused') {
    return `Paused at ${formatClock(b.remainingMs)}`
  }
  if (a.status !== 'idle' && b.status === 'idle') {
    return `${nextName} reset to ${formatClock(b.remainingMs)}`
  }
  return null
}

/** Notification permission results reported from Settings (L1, L2). */
export const ANNOUNCE_NOTIFICATIONS_ALLOWED = 'Notifications allowed'
export const ANNOUNCE_NOTIFICATIONS_BLOCKED = 'Notifications blocked. Sound alerts still work.'
export const ANNOUNCE_SETTINGS_SAVED = 'Settings saved'
