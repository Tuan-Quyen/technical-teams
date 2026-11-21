import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import { initialTimer } from '../domain/timer.ts'
import type { Timer } from '../domain/types.ts'
import { ProgressRing } from './ProgressRing.tsx'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()
const base = initialTimer(DEFAULT_SETTINGS)
const running: Timer = { ...base, status: 'running', endAt: T0 + base.durationMs }
const offset = () => Number(screen.getByTestId('ring-progress').getAttribute('stroke-dashoffset'))

// Real clock: the tween runs on Motion's frame loop.
describe('ProgressRing', () => {
  it('tweens strokeDashoffset towards elapsed / total while running (POMO-AC7)', async () => {
    const { rerender } = render(<ProgressRing timer={running} now={T0} />)
    expect(offset()).toBe(1)
    rerender(<ProgressRing timer={running} now={T0 + 5 * 60_000} />)
    await waitFor(() => {
      expect(offset()).toBeCloseTo(0.8, 6)
    })
  })

  it('Pause stops a tween mid-flight and holds the exact paused value', async () => {
    const { rerender } = render(<ProgressRing timer={running} now={T0} />)
    rerender(<ProgressRing timer={running} now={T0 + 5 * 60_000} />)
    const paused: Timer = { ...base, status: 'paused', remainingMs: 24 * 60_000 }
    rerender(<ProgressRing timer={paused} now={T0 + 5 * 60_000} />)
    await waitFor(() => {
      expect(offset()).toBeCloseTo(24 / 25, 9)
    })
    await new Promise((r) => setTimeout(r, 400))
    expect(offset()).toBeCloseTo(24 / 25, 9)
  })

  it('draws the restored value on first render, with no entry animation (POMO-AC19)', () => {
    render(<ProgressRing timer={running} now={T0 + 10 * 60_000} />)
    expect(offset()).toBeCloseTo(0.6, 9)
  })

  it('resets to an empty ring when the phase changes', async () => {
    const { rerender } = render(<ProgressRing timer={running} now={T0 + 24 * 60_000} />)
    const next: Timer = { ...base, phase: 'short', status: 'idle', phaseId: 1 }
    rerender(<ProgressRing timer={next} now={T0 + 25 * 60_000} />)
    await waitFor(() => {
      expect(offset()).toBe(1)
    })
  })
})
