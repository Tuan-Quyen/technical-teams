import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { remaining } from '../domain/timer.ts'
import type { Timer } from '../domain/types.ts'

interface ProgressRingProps {
  timer: Timer
  now: number
  /** `focus` is the larger ring of the Focus view; the digits scale with it (container units). */
  size?: 'main' | 'focus'
  /** Centred inside the ring (the digits). */
  children?: ReactNode
}

const RADIUS = 46
const STROKE = 2.6
const PHASE_CHANGE = { duration: 0.32, ease: [0.22, 1, 0.36, 1] } as const
const SIZE = {
  main: 'size-[min(78vw,56vh,320px)] lg:size-95 short:size-[min(56vh,240px)]',
  focus: '@container size-[min(88vw,62vh,720px)]',
} as const
const TICK = { duration: 0.25, ease: 'linear' } as const

/**
 * Unfilled share of the ring from timestamps (POMO-AC7): 1 draws nothing, 0 draws all. With
 * `stepPerSecond` it follows the digits, which change once per second.
 */
function offsetFor(timer: Timer, now: number, stepPerSecond: boolean): number {
  if (timer.durationMs <= 0) return 1
  const left = remaining(timer, now)
  const shown = stepPerSecond ? Math.ceil(left / 1000) * 1000 : left
  return Math.min(1, Math.max(0, shown / timer.durationMs))
}

/**
 * Animates `strokeDashoffset` only. Running: a short linear tween per tick. Paused or idle: set
 * outright, so Pause freezes on the exact value and Resume continues from it. Phase change:
 * 320 ms ease. `MotionConfig reducedMotion` does not cover stroke offsets, so the ring reads
 * `useReducedMotion()` itself: no tween, and it steps once per second (POMO-E11).
 */
export function ProgressRing({ timer, now, size = 'main', children }: ProgressRingProps) {
  const reduced = useReducedMotion() === true
  const target = offsetFor(timer, now, reduced)
  const offset = useMotionValue(target)
  const lastPhaseId = useRef(timer.phaseId)

  useEffect(() => {
    const phaseChanged = lastPhaseId.current !== timer.phaseId
    lastPhaseId.current = timer.phaseId
    if (reduced || (!phaseChanged && timer.status !== 'running')) {
      offset.set(target)
      return
    }
    const controls = animate(offset, target, phaseChanged ? PHASE_CHANGE : TICK)
    return () => {
      controls.stop()
    }
  }, [offset, target, timer.phaseId, timer.status, reduced])

  const dim = timer.status === 'paused' ? 'opacity-60' : ''
  const glow = timer.status === 'running' && !reduced ? 'drop-shadow-[0_0_12px_var(--accent)]' : ''

  return (
    <div className={`relative grid place-items-center ${SIZE[size]}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[30%] hidden rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_6%,transparent),transparent)] lg:block short:hidden"
      />
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 100"
        className={`absolute inset-0 size-full -rotate-90 ${dim}`}
      >
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-ring-track"
        />
        <motion.circle
          data-testid="ring-progress"
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 2"
          style={{ strokeDashoffset: offset }}
          className={`stroke-accent ${glow}`}
        />
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}
