import { CYCLE } from '../domain/settings.ts'
import type { Phase } from '../domain/types.ts'

interface CycleDotsProps {
  completed: number
  phase: Phase
}

export function CycleDots({ completed, phase }: CycleDotsProps) {
  const current = phase === 'focus' ? completed : -1
  return (
    <div
      role="img"
      aria-label={`${String(completed)} of ${String(CYCLE)} focus sessions completed`}
      className="flex items-center gap-3"
    >
      <div className="flex gap-2">
        {Array.from({ length: CYCLE }, (_, i) => {
          const style =
            i < completed
              ? 'bg-accent'
              : i === current
                ? 'border-2 border-accent'
                : 'border border-border-strong'
          return <span key={i} className={`size-2.5 rounded-full ${style}`} />
        })}
      </div>
      <span className="text-xs font-medium text-text-secondary tabular-nums">
        {completed}/{CYCLE}
      </span>
    </div>
  )
}
