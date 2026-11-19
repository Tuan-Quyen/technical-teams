import { useId, type ReactNode } from 'react'

interface ToggleProps {
  label: string
  helper: string
  checked: boolean
  onChange: (next: boolean) => void
  /** Optional leading icon (Sound: Volume2 / VolumeX). */
  icon?: ReactNode
}

/** The whole row (label + switch) is the hit area; a native button gives Enter / Space. */
export function Toggle({ label, helper, checked, onChange, icon }: ToggleProps) {
  const id = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-l`}
      aria-describedby={`${id}-h`}
      onClick={() => {
        onChange(!checked)
      }}
      className="flex min-h-12 w-full items-center gap-3 rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {icon}
      <span className="flex flex-1 flex-col">
        <span id={`${id}-l`} className="text-sm font-medium">
          {label}
        </span>
        <span id={`${id}-h`} className="text-xs text-text-secondary">
          {helper}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 motion-reduce:transition-none ${checked ? 'border-accent bg-accent' : 'border-border-strong bg-bg-elevated'}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full transition-transform duration-200 motion-reduce:transition-none ${checked ? 'translate-x-5.5 bg-text-on-accent' : 'translate-x-0.5 bg-text-secondary'}`}
        />
      </span>
    </button>
  )
}
