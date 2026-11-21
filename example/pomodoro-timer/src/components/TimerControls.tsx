import { motion } from 'motion/react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { isFresh } from '../domain/timer.ts'
import * as chime from '../services/chime.ts'
import * as notify from '../services/notify.ts'
import { useTimerStore } from '../store/timerStore.ts'
import { Button } from './ui/Button.tsx'
import { IconButton } from './ui/IconButton.tsx'

const PRIMARY = {
  idle: { label: 'Start', Icon: Play },
  running: { label: 'Pause', Icon: Pause },
  paused: { label: 'Resume', Icon: Play },
} as const

const ICON = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const

/** Reset · Start / Pause / Resume · Skip. Every click acts on the state at that moment (POMO-E3). */
export function TimerControls() {
  const timer = useTimerStore((s) => s.timer)
  const settings = useTimerStore((s) => s.settings)
  const start = useTimerStore((s) => s.start)
  const notifyAsked = useTimerStore((s) => s.notifyAsked)
  const markNotifyAsked = useTimerStore((s) => s.markNotifyAsked)
  const pause = useTimerStore((s) => s.pause)
  const reset = useTimerStore((s) => s.reset)
  const skip = useTimerStore((s) => s.skip)

  const { label, Icon } = PRIMARY[timer.status]
  const running = timer.status === 'running'
  // Reset on a fresh phase is a no-op in the engine (POMO-E9); aria-disabled keeps it focusable.
  const resetIdle = isFresh(timer, settings)

  // Start / Resume click: the timer starts first and never waits for anything below. The same
  // click arms audio (needs a user gesture) and, once ever, asks for notification permission.
  const onStart = () => {
    start()
    chime.arm()
    if (!notifyAsked && notify.support() === 'default') {
      void notify.requestPermission()
      markNotifyAsked()
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      <IconButton
        label="Reset timer"
        icon={<RotateCcw {...ICON} />}
        aria-disabled={resetIdle ? true : undefined}
        onClick={reset}
      />
      <Button
        variant="primary"
        data-autofocus=""
        icon={<Icon {...ICON} />}
        className={`min-h-14 min-w-40 ${running ? 'shadow-[0_0_48px_color-mix(in_srgb,var(--accent)_25%,transparent)]' : ''}`}
        onClick={running ? pause : onStart}
      >
        <motion.span
          key={label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12 }}
        >
          {label}
        </motion.span>
      </Button>
      <IconButton label="Skip to next phase" icon={<SkipForward {...ICON} />} onClick={skip} />
    </div>
  )
}
