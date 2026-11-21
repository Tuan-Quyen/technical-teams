import { Minimize2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap.ts'
import type { PhaseEnd, Timer } from '../domain/types.ts'
import { ProgressRing } from './ProgressRing.tsx'
import { TimerControls } from './TimerControls.tsx'
import { TimerDisplay } from './TimerDisplay.tsx'
import { IconButton } from './ui/IconButton.tsx'

interface FocusViewProps {
  timer: Timer
  lastEnd: PhaseEnd | null
  now: number
  onExit: () => void
}

const IDLE_MS = 3000

/**
 * Phase, ring, digits and controls on `bg.base`. The same view serves native fullscreen and the
 * in-app overlay (POMO-E7). Initial focus goes to the primary control (`data-autofocus` in `TimerControls`). Esc is handled on this element by `useFocusTrap`, never on the document; in
 * native fullscreen the browser's own Esc leaves fullscreen and `useFullscreen` closes the view.
 */
export function FocusView({ timer, lastEnd, now, onExit }: FocusViewProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion() === true
  const [idle, setIdle] = useState(false)
  const [activity, setActivity] = useState(0)

  useFocusTrap(rootRef, onExit)

  useEffect(() => {
    const id = setTimeout(() => {
      setIdle(true)
    }, IDLE_MS)
    return () => {
      clearTimeout(id)
    }
  }, [activity])

  const wake = () => {
    setIdle(false)
    setActivity((n) => n + 1)
  }

  return (
    <motion.div
      ref={rootRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0.12 : 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      tabIndex={-1}
      onPointerMove={wake}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-bg-base outline-none"
    >
      <div className="absolute top-4 right-4">
        <IconButton
          variant="ghost"
          label="Exit focus mode"
          icon={<Minimize2 size={24} strokeWidth={1.75} aria-hidden="true" />}
          onClick={onExit}
          onFocus={wake}
          className={`transition-opacity duration-200 motion-reduce:transition-none focus-visible:opacity-100 ${idle ? 'opacity-60' : 'opacity-100'}`}
        />
      </div>
      <ProgressRing timer={timer} now={now} size="focus">
        <TimerDisplay timer={timer} lastEnd={lastEnd} now={now} focusView />
      </ProgressRing>
      <TimerControls />
    </motion.div>
  )
}
