import type { PhaseEnd } from '../domain/types.ts'
import { STORAGE_KEY } from '../store/persistence.ts'
import { useTimerStore } from '../store/timerStore.ts'

/** Timeout margin past `endAt`, so the one-shot fires after the end, not just before it. */
const END_MARGIN_MS = 50
/** Largest delay `setTimeout` accepts; a bigger one fires at once. */
const MAX_TIMEOUT_MS = 2 ** 31 - 1

export interface RuntimeOptions {
  store?: typeof useTimerStore
  /**
   * Seam for alerts (sound, notification; POMO-T8). Called once per natural phase end, including an
   * end restored on page load. Never called for Skip or Reset.
   */
  onPhaseEnd?: (end: PhaseEnd) => void
}

let stopCurrent: (() => void) | null = null

/**
 * Starts the timer runtime once, outside React so StrictMode cannot start it twice.
 * Idempotent: while a runtime is running, further calls return its stop function unchanged.
 * Call `restoreOnLoad()` first so a phase that ended while the page was closed is handled
 * as an away end, never as a live one.
 */
export function startRuntime(options: RuntimeOptions = {}): () => void {
  if (stopCurrent) return stopCurrent

  const store = options.store ?? useTimerStore
  const onPhaseEnd = options.onPhaseEnd ?? (() => undefined)

  // Re-handling the same phase is safe: `complete` only acts on a running phase past its
  // `endAt`, and every completion bumps `phaseId`, so a second trigger finds nothing to do.
  const sync = () => {
    store.getState().sync('live')
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let armedEndAt: number | null = null

  const disarm = () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    timeoutId = undefined
  }

  const arm = () => {
    disarm()
    const { endAt } = store.getState().timer
    armedEndAt = endAt
    if (endAt === null) return
    timeoutId = setTimeout(
      () => {
        sync()
        // Clock still short of `endAt` (adjusted backwards): try again against the same end.
        const { timer } = store.getState()
        if (timer.endAt === armedEndAt) arm()
      },
      Math.min(Math.max(0, endAt - Date.now()) + END_MARGIN_MS, MAX_TIMEOUT_MS),
    )
  }

  const applyPhase = () => {
    document.documentElement.dataset.phase = store.getState().timer.phase
  }

  let dispatchedPhaseId: number | null = null
  const dispatchEnd = () => {
    const { lastEnd } = store.getState()
    if (!lastEnd || lastEnd.phaseId === dispatchedPhaseId) return
    dispatchedPhaseId = lastEnd.phaseId
    onPhaseEnd(lastEnd)
  }

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.timer.endAt !== prev.timer.endAt) arm()
    if (state.timer.phase !== prev.timer.phase) applyPhase()
    if (state.lastEnd !== prev.lastEnd) dispatchEnd()
  })

  const onVisibility = () => {
    if (document.visibilityState === 'visible') sync()
  }
  const onFocus = () => {
    sync()
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return
    // Key removed or storage cleared elsewhere: keep this tab's timer; it re-saves on its next change.
    if (event.newValue === null) return
    // Last write wins (POMO-AC23): adopt the other tab's state, then settle any end it left behind.
    void Promise.resolve(store.persist.rehydrate()).then(sync)
  }
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onFocus)
  window.addEventListener('storage', onStorage)

  applyPhase()
  arm()
  dispatchEnd() // an end restored on load (`restoreOnLoad` ran before us)

  const stop = () => {
    disarm()
    unsubscribe()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onFocus)
    window.removeEventListener('storage', onStorage)
    stopCurrent = null
  }
  stopCurrent = stop
  return stop
}
