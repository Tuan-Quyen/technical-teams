import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * While `container` is mounted: moves focus inside (to `[data-autofocus]`, else the first
 * focusable), wraps Tab / Shift+Tab at the ends, calls `onEscape` on Esc, and puts focus back on
 * the element that had it before. The key handler sits on the container, never on the document
 * (AC24).
 */
export function useFocusTrap(container: RefObject<HTMLElement | null>, onEscape: () => void) {
  // Latest callback without re-running the trap effect, which would move focus again.
  const escape = useRef(onEscape)
  useEffect(() => {
    escape.current = onEscape
  })

  useEffect(() => {
    const root = container.current
    if (!root) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    const first = root.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0]
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        escape.current()
        return
      }
      if (e.key !== 'Tab') return
      const list = items()
      const head = list[0]
      const tail = list[list.length - 1]
      if (!head || !tail) return
      const active = document.activeElement
      // The container itself can hold focus (tabIndex -1) after a click on plain content.
      const outside = active === root || !root.contains(active)
      if (e.shiftKey && (active === head || outside)) {
        e.preventDefault()
        tail.focus()
      } else if (!e.shiftKey && (active === tail || outside)) {
        e.preventDefault()
        head.focus()
      }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => {
      root.removeEventListener('keydown', onKeyDown)
      opener?.focus()
    }
  }, [container])
}
