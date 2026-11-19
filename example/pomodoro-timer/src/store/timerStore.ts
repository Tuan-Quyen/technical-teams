import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import { DEFAULT_SETTINGS, isValidSettings } from '../domain/settings.ts'
import { complete, initialTimer, pause, reset, skip, start } from '../domain/timer.ts'
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  merge,
  migrate,
  partialize,
  type Persisted,
  safeStorage,
} from './persistence.ts'
import type { CompleteMode, PhaseEnd, Settings, Timer, TimerResult } from '../domain/types.ts'

export interface TimerState {
  settings: Settings
  timer: Timer
  /** Last natural phase end; drives the caption. Cleared by start, skip and reset. */
  lastEnd: PhaseEnd | null
  /** Time of the last phase transition (ms); input of the Skip debounce. Not persisted. */
  lastTransitionAt: number
  /** True once the notification permission was requested (E5); persisted. */
  notifyAsked: boolean
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  sync: (mode: CompleteMode) => void
  /** On page load: an overdue running phase advances once, idle, with an away `lastEnd`. */
  restoreOnLoad: () => void
  /** All-or-nothing: returns false and changes nothing if any field is invalid (AC12). */
  saveSettings: (next: Settings) => boolean
  markNotifyAsked: () => void
}

/** Store factory so tests get a fresh store; the app uses the `useTimerStore` singleton. */
export function createTimerStore(storage: StateStorage = safeStorage) {
  return create<TimerState>()(
    persist<TimerState, [], [], Persisted>(
      (set, get) => {
        /** Applies an engine result; a guarded no-op returns the same timer object and changes nothing. */
        const apply = (result: TimerResult, now: number, clearEnd: boolean) => {
          const { timer, lastEnd, lastTransitionAt } = get()
          if (result.timer === timer) return
          const transitioned = result.timer.phaseId !== timer.phaseId
          set({
            timer: result.timer,
            lastEnd: result.end ?? (clearEnd ? null : lastEnd),
            lastTransitionAt: transitioned ? now : lastTransitionAt,
          })
        }

        return {
          settings: DEFAULT_SETTINGS,
          timer: initialTimer(DEFAULT_SETTINGS),
          lastEnd: null,
          lastTransitionAt: 0,
          notifyAsked: false,
          start: () => {
            const now = Date.now()
            apply(start(get().timer, now), now, true)
          },
          pause: () => {
            const now = Date.now()
            apply(pause(get().timer, now), now, false)
          },
          reset: () => {
            const { timer, settings, lastEnd } = get()
            apply(reset(timer, settings), Date.now(), true)
            // A no-op Reset on a fresh idle phase still dismisses the phase-end caption.
            if (lastEnd && get().lastEnd) set({ lastEnd: null })
          },
          skip: () => {
            const { timer, settings, lastTransitionAt } = get()
            const now = Date.now()
            apply(skip(timer, settings, now, lastTransitionAt), now, true)
          },
          sync: (mode) => {
            const { timer, settings } = get()
            const now = Date.now()
            apply(complete(timer, settings, now, mode), now, false)
          },
          restoreOnLoad: () => {
            get().sync('load')
          },
          saveSettings: (next) => {
            if (!isValidSettings(next)) return false
            const settings: Settings = {
              focusMin: next.focusMin,
              shortMin: next.shortMin,
              longMin: next.longMin,
              autoStart: next.autoStart,
              soundOn: next.soundOn,
            }
            const { timer } = get()
            // Idle reloads the current phase at its new length; a started phase keeps its own (AC11, AC13).
            set({ settings, timer: timer.status === 'idle' ? reset(timer, settings).timer : timer })
            return true
          },
          markNotifyAsked: () => {
            set({ notifyAsked: true })
          },
        }
      },
      {
        name: STORAGE_KEY,
        version: STORAGE_VERSION,
        storage: createJSONStorage(() => storage),
        partialize,
        merge,
        migrate,
      },
    ),
  )
}

export const useTimerStore = createTimerStore()
