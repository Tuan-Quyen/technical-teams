import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimerStore } from './timerStore.ts'

const MIN = 60_000

describe('timerStore (in memory)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts fresh: Focus idle 25:00, nothing ended', () => {
    const s = createTimerStore().getState()
    expect(s.timer).toMatchObject({ phase: 'focus', status: 'idle', remainingMs: 25 * MIN })
    expect(s.lastEnd).toBeNull()
  })

  it('start / pause / start keeps the remaining time', () => {
    const store = createTimerStore()
    store.getState().start()
    vi.advanceTimersByTime(10_000)
    store.getState().pause()
    expect(store.getState().timer).toMatchObject({
      status: 'paused',
      remainingMs: 25 * MIN - 10_000,
    })
    vi.advanceTimersByTime(60_000)
    store.getState().start()
    expect(store.getState().timer.endAt).toBe(1_000_000 + 70_000 + 25 * MIN - 10_000)
  })

  it('sync("live") completes a finished phase once and records lastEnd', () => {
    const store = createTimerStore()
    store.getState().start()
    vi.advanceTimersByTime(25 * MIN)
    store.getState().sync('live')
    const first = store.getState()
    expect(first.timer).toMatchObject({ phase: 'short', status: 'running', completed: 1 })
    expect(first.lastEnd).toMatchObject({ ended: 'focus', next: 'short', away: false })
    store.getState().sync('live')
    expect(store.getState().timer).toBe(first.timer)
  })

  it('sync("load") leaves the next phase idle with an away end', () => {
    const store = createTimerStore()
    store.getState().start()
    vi.advanceTimersByTime(26 * MIN)
    store.getState().sync('load')
    expect(store.getState().timer.status).toBe('idle')
    expect(store.getState().lastEnd?.away).toBe(true)
  })

  it('skip moves on, clears lastEnd and ignores a rapid second skip (POMO-E3)', () => {
    const store = createTimerStore()
    store.setState({ lastEnd: { phaseId: 0, ended: 'long', next: 'focus', away: false } })
    store.getState().skip()
    expect(store.getState().lastEnd).toBeNull()
    expect(store.getState().timer.phase).toBe('short')
    store.getState().skip()
    expect(store.getState().timer.phase).toBe('short')
    vi.advanceTimersByTime(300)
    store.getState().skip()
    expect(store.getState().timer.phase).toBe('focus')
  })

  it('reset returns the current phase to idle and clears lastEnd', () => {
    const store = createTimerStore()
    store.getState().start()
    vi.advanceTimersByTime(5_000)
    store.setState({ lastEnd: { phaseId: 0, ended: 'long', next: 'focus', away: false } })
    store.getState().reset()
    expect(store.getState().lastEnd).toBeNull()
    expect(store.getState().timer).toMatchObject({ status: 'idle', remainingMs: 25 * MIN })
  })
})
