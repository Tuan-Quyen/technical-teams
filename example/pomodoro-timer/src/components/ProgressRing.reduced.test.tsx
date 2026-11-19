import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import { ProgressRing } from './ProgressRing.tsx'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()

// Own file: `motion` reads the media query once per module instance.
describe('ProgressRing with prefers-reduced-motion (E11)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }) as unknown as MediaQueryList,
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('steps once per second instead of tweening, with no glow', async () => {
    const base = initialTimer(DEFAULT_SETTINGS)
    const timer = { ...base, status: 'running' as const, endAt: T0 + base.remainingMs }
    // 1.5 s elapsed: the digits read 24:58 (1498.5 s left, rounded up to 1499 s).
    const { rerender } = render(<ProgressRing timer={timer} now={T0 + 1500} />)
    const ring = screen.getByTestId('ring-progress')
    await waitFor(() => {
      expect(Number(ring.getAttribute('stroke-dashoffset'))).toBeCloseTo(1499 / 1500, 6)
    })
    expect(ring.getAttribute('class')).not.toContain('drop-shadow')

    // Still inside the same second: no movement.
    act(() => {
      rerender(<ProgressRing timer={timer} now={T0 + 1900} />)
    })
    expect(Number(ring.getAttribute('stroke-dashoffset'))).toBeCloseTo(1499 / 1500, 6)
  })
})
