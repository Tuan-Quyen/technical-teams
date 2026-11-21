let context: AudioContext | null = null

type AudioContextCtor = typeof AudioContext

function contextClass(): AudioContextCtor | undefined {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor
    webkitAudioContext?: AudioContextCtor
  }
  return w.AudioContext ?? w.webkitAudioContext
}

/** Creates (once) and resumes the audio context; resolves when that attempt settles. Never throws. */
function start(): Promise<void> {
  try {
    if (!context) {
      const Ctor = contextClass()
      if (!Ctor) return Promise.resolve()
      context = new Ctor()
    }
    if (context.state !== 'running') return context.resume().catch(() => undefined)
  } catch {
    // no audio: the timer and notifications still work
  }
  return Promise.resolve()
}

/**
 * Creates (once) and resumes the audio context. Call it from a user gesture (the Start click),
 * since browsers keep a context created elsewhere suspended. Never throws.
 */
export function arm(): void {
  void start()
}

const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const
let removeGestureListeners: (() => void) | null = null

/**
 * After a reload there is no Start click, so the context would stay suspended and a phase end
 * would be silent (REVI-R1). Arms on the first pointerdown, keydown or touchend anywhere in the
 * document, and stops listening once the context is running. Safe to call more than once.
 */
export function armOnGesture(): void {
  if (removeGestureListeners || ready()) return
  const onGesture = () => {
    void start().then(() => {
      if (ready()) removeGestureListeners?.()
    })
  }
  removeGestureListeners = () => {
    for (const type of GESTURES) document.removeEventListener(type, onGesture, true)
    removeGestureListeners = null
  }
  for (const type of GESTURES) document.addEventListener(type, onGesture, true)
}

/** True when a chime would be audible now: the context exists and is running. */
export function ready(): boolean {
  return context?.state === 'running'
}

/** Two short sine tones with a gain envelope, about 0.6 s. Returns false when it cannot play. */
export function play(): boolean {
  const ctx = context
  if (ctx?.state !== 'running') return false
  try {
    const t0 = ctx.currentTime
    for (const [i, freq] of [880, 1320].entries()) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = t0 + i * 0.25
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.32)
    }
    return true
  } catch {
    return false
  }
}

/** Test hook: drop the context. */
export function disarm(): void {
  removeGestureListeners?.()
  context = null
}
