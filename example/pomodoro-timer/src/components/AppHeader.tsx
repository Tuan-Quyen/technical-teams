import { Maximize2, Settings } from 'lucide-react'
import { IconButton } from './ui/IconButton.tsx'

interface AppHeaderProps {
  /** Wired by the Settings sheet (POMO-T7); without it the button renders `aria-disabled`. */
  onOpenSettings?: () => void
  /** Wired by focus mode (POMO-T9); without it the button renders `aria-disabled`. */
  onEnterFocus?: () => void
}

const ICON = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const

export function AppHeader({ onOpenSettings, onEnterFocus }: AppHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between">
      <h1 className="text-base font-semibold">Pomodoro</h1>
      <div className="flex items-center gap-2">
        <IconButton
          variant="ghost"
          label="Enter focus mode"
          icon={<Maximize2 {...ICON} />}
          aria-disabled={onEnterFocus ? undefined : true}
          onClick={onEnterFocus}
        />
        <IconButton
          variant="ghost"
          label="Open settings"
          icon={<Settings {...ICON} />}
          aria-disabled={onOpenSettings ? undefined : true}
          onClick={onOpenSettings}
        />
      </div>
    </header>
  )
}
