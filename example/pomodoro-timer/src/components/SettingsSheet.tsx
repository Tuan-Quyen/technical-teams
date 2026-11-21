import { motion, useReducedMotion } from 'motion/react'
import { Bell, BellRing, Volume2, VolumeX } from 'lucide-react'
import { useRef, useState, type SyntheticEvent } from 'react'
import {
  ANNOUNCE_NOTIFICATIONS_ALLOWED,
  ANNOUNCE_NOTIFICATIONS_BLOCKED,
  ANNOUNCE_SETTINGS_SAVED,
} from '../domain/format.ts'
import { LIMITS, minuteError, parseMinutes, type MinuteField } from '../domain/settings.ts'
import type { Settings } from '../domain/types.ts'
import { useFocusTrap } from '../hooks/useFocusTrap.ts'
import * as notify from '../services/notify.ts'
import { storageAvailable } from '../store/persistence.ts'
import { useTimerStore } from '../store/timerStore.ts'
import { Button } from './ui/Button.tsx'
import { InlineHint } from './ui/InlineHint.tsx'
import { NumberField } from './ui/NumberField.tsx'
import { Toggle } from './ui/Toggle.tsx'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  /** Sends a message to the page's live region, which sits outside this modal dialog. */
  onAnnounce: (message: string) => void
}

const FIELDS: readonly { field: MinuteField; label: string }[] = [
  { field: 'focusMin', label: 'Focus' },
  { field: 'shortMin', label: 'Short Break' },
  { field: 'longMin', label: 'Long Break' },
]

type Draft = Record<MinuteField, string>
type Errors = Partial<Record<MinuteField, string>>

/** Mounted only while open, so every opening starts from the saved settings. */
export function SettingsSheet({ open, onClose, onAnnounce }: SettingsSheetProps) {
  return open ? <Dialog onClose={onClose} onAnnounce={onAnnounce} /> : null
}

function Dialog({
  onClose,
  onAnnounce,
}: {
  onClose: () => void
  onAnnounce: (message: string) => void
}) {
  const reduced = useReducedMotion() === true
  const settings = useTimerStore((s) => s.settings)
  const status = useTimerStore((s) => s.timer.status)
  const saveSettings = useTimerStore((s) => s.saveSettings)
  const notifyAsked = useTimerStore((s) => s.notifyAsked)
  const markNotifyAsked = useTimerStore((s) => s.markNotifyAsked)

  const [draft, setDraft] = useState<Draft>({
    focusMin: String(settings.focusMin),
    shortMin: String(settings.shortMin),
    longMin: String(settings.longMin),
  })
  const [autoStart, setAutoStart] = useState(settings.autoStart)
  const [soundOn, setSoundOn] = useState(settings.soundOn)
  const [errors, setErrors] = useState<Errors>({})
  // Browser state, not part of the draft: Save and Cancel do not touch it.
  const [perm, setPerm] = useState<notify.Support>(() => notify.support())
  const [asking, setAsking] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const inputs = useRef<Partial<Record<MinuteField, HTMLInputElement | null>>>({})
  useFocusTrap(dialogRef, onClose)

  const allowNotifications = () => {
    if (asking) return
    setAsking(true)
    // Called synchronously from the click so the browser sees the user activation.
    const answer = notify.requestPermission()
    markNotifyAsked()
    void answer.then((result) => {
      setAsking(false)
      setPerm(result)
      if (result === 'granted') onAnnounce(ANNOUNCE_NOTIFICATIONS_ALLOWED)
      if (result === 'denied') onAnnounce(ANNOUNCE_NOTIFICATIONS_BLOCKED)
      if (result !== 'default') focusSoundSwitch()
    })
  }

  const focusSoundSwitch = () => {
    const switches = dialogRef.current?.querySelectorAll<HTMLElement>('[role="switch"]') ?? []
    Array.from(switches)
      .find((el) => el.textContent.startsWith('Sound'))
      ?.focus()
  }

  const check = (field: MinuteField, text: string): string | undefined => {
    const n = parseMinutes(text)
    const { min, max } = LIMITS[field]
    return n !== null && n >= min && n <= max ? undefined : minuteError(LIMITS[field])
  }

  const setField = (field: MinuteField, text: string) => {
    setDraft((d) => ({ ...d, [field]: text }))
    // An error clears as soon as the text becomes valid; a new one waits for blur or Save.
    if (errors[field] && !check(field, text)) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const onBlur = (field: MinuteField) => {
    setErrors((e) => ({ ...e, [field]: check(field, draft[field]) }))
  }

  const onSubmit = (e: SyntheticEvent) => {
    e.preventDefault()
    const next: Errors = {}
    for (const { field } of FIELDS) next[field] = check(field, draft[field])
    setErrors(next)
    const firstBad = FIELDS.find(({ field }) => next[field])
    if (firstBad) {
      inputs.current[firstBad.field]?.focus()
      return
    }
    const values: Settings = {
      focusMin: Number(draft.focusMin),
      shortMin: Number(draft.shortMin),
      longMin: Number(draft.longMin),
      autoStart,
      soundOn,
    }
    if (saveSettings(values)) {
      onClose()
      // The dialog is gone by now, so the live region outside it is reachable again.
      onAnnounce(ANNOUNCE_SETTINGS_SAVED)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        initial={{ opacity: 0, y: reduced ? 0 : 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? { duration: 0.12 } : { type: 'spring', stiffness: 380, damping: 34 }}
        className="relative flex max-h-[90dvh] outline-none w-full flex-col rounded-t-xl border border-border-subtle bg-bg-surface shadow-[0_24px_64px_rgb(0_0_0/0.6)] sm:max-w-105 sm:rounded-xl"
      >
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col items-center pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-border-strong" />
          </div>
          <h2 id="settings-title" className="px-6 pt-4 text-xl font-semibold">
            Settings
          </h2>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
            {!storageAvailable && (
              <InlineHint>
                Settings and progress won&apos;t be saved in this browser. Changes last until you
                close or reload the page.
              </InlineHint>
            )}

            <section aria-labelledby="durations-h" className="flex flex-col gap-4">
              <h3
                id="durations-h"
                className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase"
              >
                Durations
              </h3>
              {status !== 'idle' && (
                <InlineHint>
                  The current phase keeps its length. New durations apply from the next phase.
                </InlineHint>
              )}
              {FIELDS.map(({ field, label }) => (
                <NumberField
                  key={field}
                  label={label}
                  value={draft[field]}
                  limits={LIMITS[field]}
                  error={errors[field]}
                  autoFocus={field === 'focusMin'}
                  inputRef={(el) => {
                    inputs.current[field] = el
                  }}
                  onChange={(text) => {
                    setField(field, text)
                  }}
                  onBlur={() => {
                    onBlur(field)
                  }}
                  onStep={(n) => {
                    setField(field, String(n))
                    setErrors((e) => ({ ...e, [field]: undefined }))
                  }}
                />
              ))}
              <p className="text-xs text-text-muted">4 focus sessions, then a Long Break.</p>
            </section>

            <section aria-labelledby="alerts-h" className="flex flex-col gap-2">
              <h3
                id="alerts-h"
                className="text-xs font-medium tracking-[0.08em] text-text-secondary uppercase"
              >
                Alerts
              </h3>
              <Toggle
                label="Auto-start next phase"
                helper="Start the next phase automatically."
                checked={autoStart}
                onChange={setAutoStart}
              />
              <Toggle
                label="Sound"
                helper="Play a chime when a phase ends."
                checked={soundOn}
                onChange={setSoundOn}
                icon={
                  soundOn ? (
                    <Volume2 size={20} strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <VolumeX size={20} strokeWidth={1.75} aria-hidden="true" />
                  )
                }
              />
              <NotificationStatus
                perm={perm}
                asked={notifyAsked}
                soundOn={soundOn}
                asking={asking}
                onAllow={allowNotifications}
              />
            </section>
          </div>

          <div className="flex gap-3 border-t border-border-subtle px-6 py-4 sm:justify-end">
            <Button type="button" className="flex-1 sm:flex-none" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 sm:flex-none">
              Save
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

interface NotificationStatusProps {
  perm: notify.Support
  asked: boolean
  soundOn: boolean
  asking: boolean
  onAllow: () => void
}

/** Notification hint N1-N5, the granted status G1 and the Allow button (POMO-AC15, POMO-AC25). */
function NotificationStatus({ perm, asked, soundOn, asking, onAllow }: NotificationStatusProps) {
  if (perm === 'granted') {
    return (
      <InlineHint icon={BellRing}>
        Notifications are on. You&apos;ll get an alert when a phase ends.
      </InlineHint>
    )
  }
  if (perm === 'default') {
    return (
      <>
        <InlineHint>
          {asked
            ? "Notifications are off. Allow them below, or in your browser's site settings."
            : "Get alerts while you're in other tabs. Allow notifications now, or you'll be asked when you first press Start."}
        </InlineHint>
        <Button
          type="button"
          icon={<Bell size={20} strokeWidth={1.75} aria-hidden="true" />}
          aria-disabled={asking ? true : undefined}
          className="w-full sm:w-auto sm:self-start"
          onClick={onAllow}
        >
          Allow notifications
        </Button>
      </>
    )
  }
  const text = !soundOn
    ? 'Notifications are unavailable and Sound is off. Turn on Sound to be alerted when a phase ends.'
    : perm === 'denied'
      ? 'Notifications are blocked in your browser settings. Sound alerts still work.'
      : "This browser doesn't support notifications. Sound alerts still work."
  return <InlineHint variant="warn">{text}</InlineHint>
}
