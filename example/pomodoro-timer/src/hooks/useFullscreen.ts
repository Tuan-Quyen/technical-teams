import { useCallback, useEffect, useRef, useState } from 'react'
import * as fullscreen from '../services/fullscreen.ts'

type Mode = 'closed' | 'overlay' | 'native'

export interface FocusModeControl {
  open: boolean
  enter: () => void
  exit: () => void
}

/**
 * Focus mode state. `enter` opens the view at once as the in-app overlay and asks the browser for
 * native fullscreen in the same click; if that resolves, the mode becomes `native`, otherwise the
 * overlay stays (POMO-E7). Leaving native fullscreen from the browser (its own Esc) closes the view.
 */
export function useFullscreen(): FocusModeControl {
  const [open, setOpen] = useState(false)
  // The mode lives in a ref so async callbacks read the current value and updaters stay pure.
  const mode = useRef<Mode>('closed')

  const setMode = useCallback((next: Mode) => {
    mode.current = next
    setOpen(next !== 'closed')
  }, [])

  useEffect(
    () =>
      fullscreen.onChange(() => {
        if (!fullscreen.isActive() && mode.current === 'native') setMode('closed')
      }),
    [setMode],
  )

  // Unmounting closes the view: leave native fullscreen, and make a pending grant exit on arrival.
  // No state update here: the component is gone.
  useEffect(
    () => () => {
      const wasNative = mode.current === 'native'
      mode.current = 'closed'
      if (wasNative) void fullscreen.exit()
    },
    [],
  )

  const enter = useCallback(() => {
    setMode('overlay')
    void fullscreen.enter().then((granted) => {
      if (!granted) return
      if (mode.current === 'closed') {
        // The view was closed before the browser answered: do not leave the page fullscreen.
        void fullscreen.exit()
      } else if (mode.current === 'overlay') {
        setMode('native')
      }
    })
  }, [setMode])

  const exit = useCallback(() => {
    setMode('closed')
    void fullscreen.exit()
  }, [setMode])

  return { open, enter, exit }
}
