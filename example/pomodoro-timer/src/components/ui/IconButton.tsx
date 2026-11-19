import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'secondary' | 'ghost'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: the icon alone names nothing. Also shown as the desktop tooltip. */
  label: string
  icon: ReactNode
  variant?: Variant
}

const VARIANT: Record<Variant, string> = {
  secondary: 'bg-bg-elevated text-text-primary border border-border-subtle',
  ghost: 'bg-transparent text-text-primary',
}

export function IconButton({
  label,
  icon,
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-transform duration-120 ease-out-soft active:scale-97 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  )
}
