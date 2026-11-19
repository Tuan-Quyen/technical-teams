import type { Phase, Settings } from './types.ts'

export const CYCLE = 4

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  autoStart: true,
  soundOn: true,
}

export interface Limits {
  min: number
  max: number
}

export const LIMITS = {
  focusMin: { min: 1, max: 120 },
  shortMin: { min: 1, max: 30 },
  longMin: { min: 1, max: 60 },
} as const satisfies Record<string, Limits>

export type MinuteField = keyof typeof LIMITS

export const MS_PER_MINUTE = 60_000

export function isValidMinutes(value: unknown, limits: Limits): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= limits.min &&
    value <= limits.max
  )
}

export function minuteError(limits: Limits): string {
  return `Enter a whole number from ${String(limits.min)} to ${String(limits.max)}.`
}

/** Parses field text: a plain run of digits, otherwise `null` (empty, "1.5", "-3", "abc"). */
export function parseMinutes(text: string): number | null {
  const trimmed = text.trim()
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null
}

/** Per-field error messages; an empty object means the minute fields are valid. */
export function validateSettings(s: Settings): Partial<Record<MinuteField, string>> {
  const errors: Partial<Record<MinuteField, string>> = {}
  for (const field of Object.keys(LIMITS) as MinuteField[]) {
    if (!isValidMinutes(s[field], LIMITS[field])) errors[field] = minuteError(LIMITS[field])
  }
  return errors
}

export function isValidSettings(s: Settings): boolean {
  return (
    Object.keys(validateSettings(s)).length === 0 &&
    typeof s.autoStart === 'boolean' &&
    typeof s.soundOn === 'boolean'
  )
}

export function phaseMinutes(phase: Phase, s: Settings): number {
  return phase === 'focus' ? s.focusMin : phase === 'short' ? s.shortMin : s.longMin
}

export function phaseDurationMs(phase: Phase, s: Settings): number {
  return phaseMinutes(phase, s) * MS_PER_MINUTE
}
