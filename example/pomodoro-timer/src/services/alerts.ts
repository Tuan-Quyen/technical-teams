import { notificationTitleFor } from '../domain/format.ts'
import type { PhaseEnd } from '../domain/types.ts'
import { useTimerStore } from '../store/timerStore.ts'
import * as chime from './chime.ts'
import * as notify from './notify.ts'

/** How long a claim on a phase end is held, so slower tabs find it taken. */
export const CLAIM_HOLD_MS = 10_000

type Kind = 'sound' | 'notify'

/**
 * Runs `fn` in at most one tab per (kind, phaseId): Web Locks are shared across the origin and
 * `ifAvailable` hands `null` to every later tab. Without Web Locks, or if the request fails,
 * `fn` runs directly (the notification `tag` still dedupes; a double chime is accepted).
 */
export function claim(kind: Kind, phaseId: number, fn: () => void): void {
  let ran = false
  const run = () => {
    if (ran) return
    ran = true
    fn()
  }
  try {
    const locks = navigator.locks as LockManager | undefined
    if (!locks) {
      run()
      return
    }
    locks
      .request(`pomodoro-timer:${kind}:${String(phaseId)}`, { ifAvailable: true }, async (lock) => {
        if (!lock) return
        run()
        await new Promise<void>((resolve) => setTimeout(resolve, CLAIM_HOLD_MS))
      })
      .catch(() => {
        run()
      })
  } catch {
    run()
  }
}

let lastAlertedPhaseId: number | null = null

/** One chime (Sound on, audio ready) and one notification (granted) per phase end. */
export function phaseEnded(end: PhaseEnd): void {
  if (end.phaseId === lastAlertedPhaseId) return
  lastAlertedPhaseId = end.phaseId

  if (useTimerStore.getState().settings.soundOn && chime.ready()) {
    claim('sound', end.phaseId, () => {
      chime.play()
    })
  }
  if (notify.support() === 'granted') {
    claim('notify', end.phaseId, () => {
      notify.show(notificationTitleFor(end), end.phaseId)
    })
  }
}

/** Test hook: forget the last alerted phase. */
export function resetAlerts(): void {
  lastAlertedPhaseId = null
}
