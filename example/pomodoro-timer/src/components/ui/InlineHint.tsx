import { BellOff, Info, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface InlineHintProps {
  variant?: 'info' | 'warn'
  /** Replaces the variant default icon (e.g. BellRing for the granted status). */
  icon?: LucideIcon
  children: ReactNode
}

/** Static text row: never focusable, no live role. */
export function InlineHint({ variant = 'info', icon, children }: InlineHintProps) {
  const Icon = icon ?? (variant === 'warn' ? BellOff : Info)
  const tone = variant === 'warn' ? 'text-status-warn' : 'text-text-secondary'
  return (
    <div className="flex gap-3 rounded-md bg-bg-elevated px-3 py-3 text-xs leading-5 text-text-secondary">
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" className={`mt-0.5 shrink-0 ${tone}`} />
      <p>{children}</p>
    </div>
  )
}
