import { motion } from 'motion/react'
import { PHASE_LABEL } from '../domain/format.ts'
import type { Phase } from '../domain/types.ts'

const PHASES: readonly Phase[] = ['focus', 'short', 'long']

/**
 * Display only (BR-10, POMO-AC24): a plain list, not buttons or `role="tab"`, never focusable, and no
 * hover, pointer or focus styling. Skip is the only way to change phase.
 */
export function PhaseTabs({ phase }: { phase: Phase }) {
  return (
    <ol
      aria-label="Phase"
      className="m-0 grid h-10 w-full list-none grid-cols-3 rounded-full bg-bg-surface p-0 select-none sm:w-96"
    >
      {PHASES.map((p) => {
        const active = p === phase
        return (
          <li
            key={p}
            aria-current={active ? 'step' : undefined}
            className={`relative flex cursor-default items-center justify-center text-sm font-medium ${active ? 'text-text-primary' : 'text-text-secondary'}`}
          >
            {active && (
              <motion.span
                layoutId="phase-pill"
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-accent/14"
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
              />
            )}
            <span className="relative">{PHASE_LABEL[p]}</span>
          </li>
        )
      })}
    </ol>
  )
}
