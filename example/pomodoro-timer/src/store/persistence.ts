import type { StateStorage } from 'zustand/middleware'
import {
  CYCLE,
  DEFAULT_SETTINGS,
  LIMITS,
  MS_PER_MINUTE,
  isValidMinutes,
} from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import type { Phase, Settings, Status, Timer } from '../domain/types.ts'

export const STORAGE_KEY = 'pomodoro-timer'
export const STORAGE_VERSION = 1
/** Longest legal phase; a stored `durationMs` above it cannot come from the app. */
export const MAX_DURATION_MS = LIMITS.focusMin.max * MS_PER_MINUTE
/** Tolerance for a clock moved backwards between save and load (POMO-E1). */
const END_SLACK_MS = 60_000
const PROBE_KEY = `${STORAGE_KEY}:probe`

/** The slice of the store that is written to storage. */
export interface Persisted {
  settings: Settings
  timer: Timer
  notifyAsked: boolean
}

type Backing = () => Storage | null

/** `localStorage`, or `null` when it is missing or access throws (privacy mode, disabled). */
const defaultBacking: Backing = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/**
 * Storage that never throws: unreadable or non-JSON data reads as "nothing stored",
 * failed writes (quota, security) are dropped and the app keeps running in memory (POMO-E2).
 */
export function createSafeStorage(backing: Backing = defaultBacking): StateStorage {
  return {
    getItem: (name) => {
      try {
        const raw = backing()?.getItem(name) ?? null
        if (raw === null) return null
        JSON.parse(raw)
        return raw
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      try {
        backing()?.setItem(name, value)
      } catch {
        // dropped on purpose: persistence is best effort
      }
    },
    removeItem: (name) => {
      try {
        backing()?.removeItem(name)
      } catch {
        // dropped on purpose: persistence is best effort
      }
    },
  }
}

export const safeStorage = createSafeStorage()

/** True when a test key can be written and removed. */
export function probeStorage(backing: Backing = defaultBacking): boolean {
  try {
    const storage = backing()
    if (!storage) return false
    storage.setItem(PROBE_KEY, '1')
    storage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

/** Probed once at module load; static for the session (POMO-AC26). */
export const storageAvailable = probeStorage()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

const PHASES: readonly unknown[] = ['focus', 'short', 'long'] satisfies Phase[]
const STATUSES: readonly unknown[] = ['idle', 'running', 'paused'] satisfies Status[]

/** Each field is kept only when it has the right type and is in range, else its default (POMO-E10). */
export function parseSettings(value: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
  const raw = isRecord(value) ? value : {}
  return {
    focusMin: isValidMinutes(raw.focusMin, LIMITS.focusMin) ? raw.focusMin : fallback.focusMin,
    shortMin: isValidMinutes(raw.shortMin, LIMITS.shortMin) ? raw.shortMin : fallback.shortMin,
    longMin: isValidMinutes(raw.longMin, LIMITS.longMin) ? raw.longMin : fallback.longMin,
    autoStart: typeof raw.autoStart === 'boolean' ? raw.autoStart : fallback.autoStart,
    soundOn: typeof raw.soundOn === 'boolean' ? raw.soundOn : fallback.soundOn,
  }
}

/**
 * The timer if every field is valid and the invariants hold, else `null`.
 * Bounded so tampered data cannot break the clock or the end timeout: `durationMs` at most
 * the longest phase, a running `endAt` at most one phase (plus slack) after `now`.
 */
export function parseTimer(value: unknown, now: number = Date.now()): Timer | null {
  if (!isRecord(value)) return null
  const { phase, status, endAt, remainingMs, durationMs, completed, phaseId } = value
  if (!PHASES.includes(phase) || !STATUSES.includes(status)) return null
  if (!isFiniteNumber(durationMs) || durationMs <= 0 || durationMs > MAX_DURATION_MS) return null
  if (!isFiniteNumber(remainingMs) || remainingMs < 0 || remainingMs > durationMs) return null
  if (endAt !== null && !isFiniteNumber(endAt)) return null
  if ((status === 'running') !== (endAt !== null)) return null
  if (endAt !== null && endAt - now > durationMs + END_SLACK_MS) return null
  if (typeof completed !== 'number' || !Number.isInteger(completed)) return null
  if (completed < 0 || completed > CYCLE) return null
  if (typeof phaseId !== 'number' || !Number.isSafeInteger(phaseId) || phaseId < 0) return null
  return {
    phase: phase as Phase,
    status: status as Status,
    endAt,
    remainingMs,
    durationMs,
    completed,
    phaseId,
  }
}

/** Anything unreadable falls back field by field; a bad timer resets to a fresh Focus (POMO-E2). */
export function parsePersisted(
  value: unknown,
  fallback: Settings = DEFAULT_SETTINGS,
  now: number = Date.now(),
): Persisted {
  const raw = isRecord(value) ? value : {}
  const settings = parseSettings(raw.settings, fallback)
  return {
    settings,
    timer: parseTimer(raw.timer, now) ?? initialTimer(settings),
    notifyAsked: raw.notifyAsked === true,
  }
}

export function partialize(state: Persisted): Persisted {
  return { settings: state.settings, timer: state.timer, notifyAsked: state.notifyAsked }
}

/** Versions older or unknown pass through: `merge` validates every field anyway. */
export function migrate(state: unknown): Persisted {
  return state as Persisted
}

/**
 * Pure validation only. The "phase ended while the page was closed" logic is `restoreOnLoad`,
 * so cross-tab rehydrates never fire it.
 */
export function merge<S extends Persisted>(persisted: unknown, current: S): S {
  return { ...current, ...parsePersisted(persisted, current.settings) }
}
