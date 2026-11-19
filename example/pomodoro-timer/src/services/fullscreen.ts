/** Fullscreen API wrapper for the whole page (`<html>`). Feature-detected; never throws or rejects. */

/** Typed `boolean` on `Document`, but absent at runtime in jsdom and iPhone Safari. */
function enabled(doc: { fullscreenEnabled?: boolean }): boolean {
  return doc.fullscreenEnabled === true
}

export function isSupported(): boolean {
  return enabled(document) && 'requestFullscreen' in document.documentElement
}

export function isActive(): boolean {
  return document.fullscreenElement !== null
}

/**
 * Asks the browser for fullscreen. Call it synchronously from the click handler (user activation).
 * Resolves `false` when unsupported or refused, so the caller falls back to the overlay (E7).
 */
export async function enter(): Promise<boolean> {
  if (!isSupported()) return false
  try {
    await document.documentElement.requestFullscreen()
    return true
  } catch {
    return false
  }
}

export async function exit(): Promise<void> {
  if (!isActive()) return
  try {
    await document.exitFullscreen()
  } catch {
    // Already left, or the browser refused: nothing to recover.
  }
}

/** Subscribes to `fullscreenchange` (also fired when the browser's own Esc leaves fullscreen). */
export function onChange(callback: () => void): () => void {
  document.addEventListener('fullscreenchange', callback)
  return () => {
    document.removeEventListener('fullscreenchange', callback)
  }
}
