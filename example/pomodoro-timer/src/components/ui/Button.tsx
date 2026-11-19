import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
}

const VARIANT: Record<Variant, string> = {
  primary: 'bg-accent text-text-on-accent',
  secondary: 'bg-bg-elevated text-text-primary border border-border-subtle',
  ghost: 'bg-transparent text-text-primary',
}

export function Button({
  variant = 'secondary',
  icon,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 min-w-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-transform duration-120 ease-out-soft active:scale-97 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}
