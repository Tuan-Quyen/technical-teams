export type Support = 'unsupported' | NotificationPermission

/** Browser permission state, or `unsupported` when the Notification API is missing. */
export function support(): Support {
  try {
    return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  } catch {
    return 'unsupported'
  }
}

/**
 * Asks for permission. Call it only from a click handler (user activation), never because of
 * stored state. Never rejects: any failure resolves to the current `support()`.
 */
export function requestPermission(): Promise<Support> {
  if (support() !== 'default') return Promise.resolve(support())
  return new Promise<Support>((resolve) => {
    const settle = () => {
      resolve(support())
    }
    try {
      // Older Safari only takes a callback and returns undefined; newer browsers return a promise.
      const result: unknown = Notification.requestPermission(settle)
      if (result instanceof Promise) result.then(settle, settle)
    } catch {
      settle()
    }
  })
}

/** Title-only notification; the tag lets a duplicate from another tab replace this one. */
export function show(title: string, phaseId: number): boolean {
  try {
    new Notification(title, { tag: `pomodoro-timer:${String(phaseId)}` })
    return true
  } catch {
    return false
  }
}
