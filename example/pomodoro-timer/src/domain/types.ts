export type Phase = 'focus' | 'short' | 'long'
export type Status = 'idle' | 'running' | 'paused'

export interface Settings {
  focusMin: number
  shortMin: number
  longMin: number
  autoStart: boolean
  soundOn: boolean
}

export interface Timer {
  phase: Phase
  status: Status
  /** Epoch ms of the scheduled end; non-null only while running. */
  endAt: number | null
  /** Time left while idle or paused (ms). */
  remainingMs: number
  /** Phase length, snapshotted when the phase is loaded (ms). */
  durationMs: number
  /** Focus sessions completed in the current cycle, 0..CYCLE. */
  completed: number
  /** Bumped on every phase transition; guards against double handling. */
  phaseId: number
}

/** Emitted by a natural phase end only, never by Skip or Reset. */
export interface PhaseEnd {
  phaseId: number
  ended: Phase
  next: Phase
  away: boolean
}

export interface TimerResult {
  timer: Timer
  end?: PhaseEnd
}

export type CompleteMode = 'live' | 'load'
