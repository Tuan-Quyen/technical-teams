import { AlertCircle, Minus, Plus } from 'lucide-react'
import { useId, type Ref } from 'react'
import type { Limits } from '../../domain/settings.ts'

interface NumberFieldProps {
  label: string
  /** Raw text, so empty and invalid input can be shown and rejected on Save. */
  value: string
  limits: Limits
  error?: string
  onChange: (text: string) => void
  onBlur: () => void
  /** Called with the stepped number; the field never steps outside `limits`. */
  onStep: (next: number) => void
  inputRef?: Ref<HTMLInputElement>
  autoFocus?: boolean
}

const STEPPER =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:opacity-40'
const ICON = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const

export function NumberField({
  label,
  value,
  limits,
  error,
  onChange,
  onBlur,
  onStep,
  inputRef,
  autoFocus = false,
}: NumberFieldProps) {
  const id = useId()
  const current = /^\d+$/.test(value.trim()) ? Number(value.trim()) : null
  const atMin = current !== null && current <= limits.min
  const atMax = current !== null && current >= limits.max
  const hint = `${String(limits.min)}–${String(limits.max)} min`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={STEPPER}
          aria-label={`Decrease ${label}`}
          aria-disabled={atMin ? true : undefined}
          onClick={() => {
            if (!atMin) onStep(current === null ? limits.min : current - 1)
          }}
        >
          <Minus {...ICON} />
        </button>
        <input
          id={id}
          ref={inputRef}
          data-autofocus={autoFocus ? '' : undefined}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-d`}
          onChange={(e) => {
            onChange(e.target.value)
          }}
          onBlur={onBlur}
          className={`h-11 w-16 rounded-sm border bg-bg-elevated px-2 text-center text-base tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${error ? 'border-status-error' : 'border-border-strong'}`}
        />
        <button
          type="button"
          className={STEPPER}
          aria-label={`Increase ${label}`}
          aria-disabled={atMax ? true : undefined}
          onClick={() => {
            if (!atMax) onStep(current === null ? limits.min : current + 1)
          }}
        >
          <Plus {...ICON} />
        </button>
        <span className="text-sm text-text-muted">min</span>
      </div>
      <p
        id={`${id}-d`}
        className={`flex items-center gap-1.5 text-xs ${error ? 'text-status-error' : 'text-text-muted'}`}
      >
        {error ? (
          <>
            <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
            {error}
          </>
        ) : (
          hint
        )}
      </p>
    </div>
  )
}
