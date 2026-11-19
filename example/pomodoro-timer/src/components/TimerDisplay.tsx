import { captionFor, formatClock, PHASE_LABEL } from '../domain/format.ts'
import { remaining } from '../domain/timer.ts'
import type { PhaseEnd, Timer } from '../domain/types.ts'

interface TimerDisplayProps {
  timer: Timer
  lastEnd: PhaseEnd | null
  now: number
  /** Larger digits for the Focus view: 96–208 px, capped at 28 % of the ring width. */
  focusView?: boolean
}

export function TimerDisplay({ timer, lastEnd, now, focusView = false }: TimerDisplayProps) {
  const caption = captionFor(timer, lastEnd)
  const dim = timer.status === 'paused' ? 'opacity-60' : ''
  const clock = formatClock(remaining(timer, now))
  // `120:00` is wider than `25:00`; shrink it so it still fits inside the ring at 360 px.
  const wide = clock.length > 5 ? 'scale-[0.85]' : ''
  const size = focusView
    ? 'text-[min(clamp(6rem,24vw,13rem),28cqw)]'
    : 'text-[clamp(4.5rem,18vw,8rem)]'
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
        {PHASE_LABEL[timer.phase]}
      </p>
      <p
        role="timer"
        aria-live="off"
        className={`${size} leading-none font-light tracking-[-0.02em] tabular-nums ${wide} ${dim}`}
      >
        {clock}
      </p>
      <p className="min-h-4 text-xs font-medium text-text-secondary">{caption}</p>
    </div>
  )
}
