import { MotionConfig } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader.tsx'
import { CycleDots } from './components/CycleDots.tsx'
import { FocusView } from './components/FocusView.tsx'
import { PhaseTabs } from './components/PhaseTabs.tsx'
import { ProgressRing } from './components/ProgressRing.tsx'
import { SettingsSheet } from './components/SettingsSheet.tsx'
import { TimerControls } from './components/TimerControls.tsx'
import { TimerDisplay } from './components/TimerDisplay.tsx'
import { announcementFor, titleFor } from './domain/format.ts'
import { remaining } from './domain/timer.ts'
import { useDocumentTitle } from './hooks/useDocumentTitle.ts'
import { useFullscreen } from './hooks/useFullscreen.ts'
import { useNow } from './hooks/useNow.ts'
import { useTimerStore } from './store/timerStore.ts'

export default function App() {
  const timer = useTimerStore((s) => s.timer)
  const lastEnd = useTimerStore((s) => s.lastEnd)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const focusMode = useFullscreen()
  const now = useNow(timer.status === 'running')
  // The one polite live region: state changes only, never the per-second digits.
  const [announcement, setAnnouncement] = useState('')

  useEffect(
    () =>
      useTimerStore.subscribe((next, prev) => {
        const text = announcementFor(prev, next)
        if (text) setAnnouncement(text)
      }),
    [],
  )

  // While a dialog is open the page behind it is `inert`; the dialogs and the live region sit
  // outside that wrapper, so screen readers keep announcing. Order matters for focus return:
  // `inert` goes on in a passive effect, which runs after the dialog's focus trap has recorded the
  // opener; it comes off in a layout effect, which runs before the trap's cleanup refocuses it.
  const pageRef = useRef<HTMLDivElement>(null)
  const dialogOpen = settingsOpen || focusMode.open
  useLayoutEffect(() => {
    if (!dialogOpen) pageRef.current?.removeAttribute('inert')
  }, [dialogOpen])
  useEffect(() => {
    if (dialogOpen) pageRef.current?.setAttribute('inert', '')
  }, [dialogOpen])

  useDocumentTitle(titleFor(timer, remaining(timer, now)))

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={pageRef}
        className="mx-auto flex min-h-dvh w-full max-w-140 flex-col px-4 pb-[env(safe-area-inset-bottom)] sm:px-6"
      >
        <AppHeader
          onEnterFocus={focusMode.enter}
          onOpenSettings={() => {
            setSettingsOpen(true)
          }}
        />
        <main className="flex flex-1 flex-col items-center gap-6 pb-8 lg:justify-center lg:pb-0 short:gap-3 short:pb-2">
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-6 lg:flex-none short:gap-3">
            <PhaseTabs phase={timer.phase} />
            <ProgressRing timer={timer} now={now}>
              <TimerDisplay timer={timer} lastEnd={lastEnd} now={now} />
            </ProgressRing>
            <CycleDots completed={timer.completed} phase={timer.phase} />
          </div>
          <TimerControls />
        </main>
      </div>
      {focusMode.open && (
        <FocusView timer={timer} lastEnd={lastEnd} now={now} onExit={focusMode.exit} />
      )}
      {/* Outside the modal dialogs; Settings reports through `onAnnounce` (see SettingsSheet). */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <SettingsSheet
        open={settingsOpen}
        onAnnounce={setAnnouncement}
        onClose={() => {
          setSettingsOpen(false)
        }}
      />
    </MotionConfig>
  )
}
