import { describe, expect, it } from 'vitest'
import {
  CYCLE,
  DEFAULT_SETTINGS,
  LIMITS,
  isValidMinutes,
  isValidSettings,
  parseMinutes,
  phaseDurationMs,
  validateSettings,
} from './settings.ts'

describe('defaults and limits (AC1, AC12)', () => {
  it('has the agreed defaults and a fixed cycle of 4', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      focusMin: 25,
      shortMin: 5,
      longMin: 15,
      autoStart: true,
      soundOn: true,
    })
    expect(CYCLE).toBe(4)
    expect(isValidSettings(DEFAULT_SETTINGS)).toBe(true)
  })
})

describe('isValidMinutes boundaries', () => {
  it.each([
    ['focusMin', 0, false],
    ['focusMin', 1, true],
    ['focusMin', 120, true],
    ['focusMin', 121, false],
    ['shortMin', 0, false],
    ['shortMin', 1, true],
    ['shortMin', 30, true],
    ['shortMin', 31, false],
    ['longMin', 0, false],
    ['longMin', 1, true],
    ['longMin', 60, true],
    ['longMin', 61, false],
  ] as const)('%s = %i -> %s', (field, value, ok) => {
    expect(isValidMinutes(value, LIMITS[field])).toBe(ok)
  })
  it('rejects non-integers, NaN, Infinity and non-numbers', () => {
    for (const v of [1.5, NaN, Infinity, -5, '5', null, undefined]) {
      expect(isValidMinutes(v, LIMITS.focusMin)).toBe(false)
    }
  })
})

describe('parseMinutes', () => {
  it('parses plain integers', () => {
    expect(parseMinutes('25')).toBe(25)
    expect(parseMinutes(' 7 ')).toBe(7)
    expect(parseMinutes('0')).toBe(0)
  })
  it('returns null for empty or malformed text', () => {
    for (const v of ['', '  ', '1.5', '-3', 'abc', '1e2', '12a']) {
      expect(parseMinutes(v)).toBeNull()
    }
  })
})

describe('validateSettings', () => {
  it('returns no errors for valid settings', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual({})
  })
  it('reports each invalid field with the fix', () => {
    const errors = validateSettings({ ...DEFAULT_SETTINGS, focusMin: 0, shortMin: 31, longMin: 61 })
    expect(errors).toEqual({
      focusMin: 'Enter a whole number from 1 to 120.',
      shortMin: 'Enter a whole number from 1 to 30.',
      longMin: 'Enter a whole number from 1 to 60.',
    })
  })
  it('isValidSettings rejects any invalid field or non-boolean toggle', () => {
    expect(isValidSettings({ ...DEFAULT_SETTINGS, focusMin: 121 })).toBe(false)
    expect(isValidSettings({ ...DEFAULT_SETTINGS, autoStart: 'yes' as unknown as boolean })).toBe(
      false,
    )
  })
})

describe('phaseDurationMs', () => {
  it('converts minutes per phase', () => {
    expect(phaseDurationMs('focus', DEFAULT_SETTINGS)).toBe(1_500_000)
    expect(phaseDurationMs('short', DEFAULT_SETTINGS)).toBe(300_000)
    expect(phaseDurationMs('long', DEFAULT_SETTINGS)).toBe(900_000)
  })
})
