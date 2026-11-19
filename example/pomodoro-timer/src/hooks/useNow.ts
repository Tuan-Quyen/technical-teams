import { useEffect, useState } from 'react'
import { remaining } from '../domain/timer.ts'
import { useTimerStore } from '../store/timerStore.ts'

const TICK_MS = 250

/**
 * Returns the current epoch ms; re-renders every 250 ms while `active`.
 * The clock is re-sampled in event callbacks only (tick, visibility, any store change), so a
 * Start / Resume click and its render share one fresh `now` and no frame uses a stale value.
 * Ticks never write timer state; the only store call is the guarded `sync` once a phase is over.
 */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(
    () =>
      useTimerStore.subscribe(() => {
        setNow(Date.now())
      }),
    [],
  )

  useEffect(() => {
    if (!active) return
    const refresh = () => {
      const t = Date.now()
      const { timer, sync } = useTimerStore.getState()
      if (timer.status === 'running' && remaining(timer, t) <= 0) sync('live')
      setNow(t)
    }
    const id = setInterval(refresh, TICK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active])

  return now
}
