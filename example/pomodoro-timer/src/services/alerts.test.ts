import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/settings.ts'
import type { PhaseEnd } from '../domain/types.ts'
import { useTimerStore } from '../store/timerStore.ts'
import { CLAIM_HOLD_MS, claim, phaseEnded, resetAlerts } from './alerts.ts'
import * as chime from './chime.ts'

const end = (phaseId: number, over: Partial<PhaseEnd> = {}): PhaseEnd => ({
  phaseId,
  ended: 'focus',
  next: 'short',
  away: false,
  ...over,
})

interface Shown {
  title: string
  options: unknown
}

const audio = { oscillators: 0, state: 'suspended' as 'suspended' | 'running' }
const shown: Shown[] = []

class FakeAudioContext {
  currentTime = 0
  destination = {}
  get state() {
    return audio.state
  }
  resume() {
    audio.state = 'running'
    return Promise.resolve()
  }
  createOscillator() {
    audio.oscillators++
    const node = { type: '', frequency: { value: 0 }, start: vi.fn(), stop: vi.fn() }
    return { ...node, connect: (next: unknown) => ({ connect: () => next }) }
  }
  createGain() {
    return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } }
  }
}

function stubNotification(permission: NotificationPermission | 'absent') {
  if (permission === 'absent') {
    vi.stubGlobal('Notification', undefined)
    return
  }
  const FakeNotification = Object.assign(
    vi.fn(function (title: string, options?: NotificationOptions) {
      shown.push({ title, options })
    }),
    { permission },
  )
  vi.stubGlobal('Notification', FakeNotification)
}

/** In-memory LockManager shared by every "tab" in the test. */
function fakeLocks() {
  const held = new Set<string>()
  return {
    request(name: string, _opts: unknown, cb: (lock: object | null) => Promise<void>) {
      if (held.has(name)) return Promise.resolve(cb(null))
      held.add(name)
      return cb({ name }).finally(() => held.delete(name))
    },
  }
}

function setLocks(value: unknown) {
  Object.defineProperty(navigator, 'locks', { value, configurable: true })
}

const flush = () => vi.advanceTimersByTimeAsync(0)
const plays = () => audio.oscillators / 2

describe('alerts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    audio.oscillators = 0
    audio.state = 'suspended'
    shown.length = 0
    chime.disarm()
    resetAlerts()
    vi.stubGlobal('AudioContext', FakeAudioContext)
    stubNotification('granted')
    setLocks(undefined)
    useTimerStore.setState({ settings: DEFAULT_SETTINGS })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    setLocks(undefined)
  })

  describe('one chime and one title-only notification (POMO-AC14, POMO-AC16)', () => {
    it('plays the chime once and shows a title-only notification with the phase tag', async () => {
      chime.arm()
      await flush()
      phaseEnded(end(3))
      await flush()
      expect(plays()).toBe(1)
      expect(shown).toEqual([
        { title: 'Focus finished — Short Break next', options: { tag: 'pomodoro-timer:3' } },
      ])
    })

    it('uses the phase names for every phase end', async () => {
      stubNotification('granted')
      const cases: [PhaseEnd, string][] = [
        [end(1, { ended: 'focus', next: 'long' }), 'Focus finished — Long Break next'],
        [end(2, { ended: 'short', next: 'focus' }), 'Short Break finished — Focus next'],
        [end(3, { ended: 'long', next: 'focus' }), 'Long Break finished — Focus next'],
      ]
      for (const [e] of cases) phaseEnded(e)
      await flush()
      expect(shown.map((s) => s.title)).toEqual(cases.map(([, t]) => t))
    })

    it('alerts once per phaseId: a repeat is ignored, a new phase alerts again', async () => {
      chime.arm()
      await flush()
      phaseEnded(end(1))
      phaseEnded(end(1))
      await flush()
      expect(plays()).toBe(1)
      expect(shown).toHaveLength(1)
      phaseEnded(end(2))
      await flush()
      expect(plays()).toBe(2)
      expect(shown).toHaveLength(2)
    })

    it('an away end alerts too (POMO-AC21)', async () => {
      phaseEnded(end(1, { away: true }))
      await flush()
      expect(shown).toHaveLength(1)
    })
  })

  describe('settings and failures (POMO-AC15, POMO-E6)', () => {
    it('Sound off: no chime, the notification still shows', async () => {
      useTimerStore.setState({ settings: { ...DEFAULT_SETTINGS, soundOn: false } })
      chime.arm()
      await flush()
      phaseEnded(end(1))
      await flush()
      expect(plays()).toBe(0)
      expect(shown).toHaveLength(1)
    })

    it('user never interacted after a reload: no chime, the notification still shows', async () => {
      chime.armOnGesture()
      phaseEnded(end(1))
      await flush()
      expect(plays()).toBe(0)
      expect(shown).toHaveLength(1)
    })

    it.each([
      ['pointerdown', () => new PointerEvent('pointerdown')],
      ['keydown', () => new KeyboardEvent('keydown', { key: 'a' })],
      ['touchend', () => new Event('touchend')],
    ])('after a reload, the first %s re-arms the chime (REVI-R1)', async (_name, make) => {
      chime.armOnGesture()
      phaseEnded(end(1))
      await flush()
      expect(plays()).toBe(0)
      document.dispatchEvent(make())
      await flush()
      phaseEnded(end(2))
      await flush()
      expect(plays()).toBe(1)
    })

    it('resume stays suspended: listeners are kept and the next gesture retries (FIX-R1)', async () => {
      let stuck = true
      class StuckContext extends FakeAudioContext {
        override resume() {
          if (!stuck) audio.state = 'running'
          return Promise.resolve()
        }
      }
      vi.stubGlobal('AudioContext', StuckContext)
      const remove = vi.spyOn(document, 'removeEventListener')
      chime.armOnGesture()
      document.dispatchEvent(new PointerEvent('pointerdown'))
      await flush()
      expect(chime.ready()).toBe(false)
      expect(remove).not.toHaveBeenCalled()
      stuck = false
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      await flush()
      expect(chime.ready()).toBe(true)
      expect(remove).toHaveBeenCalledTimes(3)
      phaseEnded(end(1))
      await flush()
      expect(plays()).toBe(1)
      remove.mockRestore()
    })

    it('stops listening once the audio is running, and a second call adds nothing', async () => {
      const add = vi.spyOn(document, 'addEventListener')
      const remove = vi.spyOn(document, 'removeEventListener')
      chime.armOnGesture()
      chime.armOnGesture()
      expect(add).toHaveBeenCalledTimes(3)
      document.dispatchEvent(new PointerEvent('pointerdown'))
      await flush()
      expect(chime.ready()).toBe(true)
      expect(remove).toHaveBeenCalledTimes(3)
      chime.armOnGesture() // already ready: no new listeners
      expect(add).toHaveBeenCalledTimes(3)
      add.mockRestore()
      remove.mockRestore()
    })

    it.each(['denied', 'default', 'absent'] as const)(
      'permission %s: no notification, no error, sound still works',
      async (permission) => {
        stubNotification(permission)
        chime.arm()
        await flush()
        expect(() => {
          phaseEnded(end(1))
        }).not.toThrow()
        await flush()
        expect(shown).toHaveLength(0)
        expect(plays()).toBe(1)
      },
    )

    it('a throwing Notification constructor is swallowed', async () => {
      vi.stubGlobal(
        'Notification',
        Object.assign(
          function Boom() {
            throw new TypeError('Illegal constructor')
          },
          { permission: 'granted' },
        ),
      )
      chime.arm()
      await flush()
      expect(() => {
        phaseEnded(end(1))
      }).not.toThrow()
      await flush()
      expect(plays()).toBe(1)
    })

    it('no AudioContext at all: nothing throws', async () => {
      vi.stubGlobal('AudioContext', undefined)
      chime.arm()
      phaseEnded(end(1))
      await flush()
      expect(shown).toHaveLength(1)
    })
  })

  describe('cross-tab claim (POMO-R11, POMO-AC23, POMO-E4)', () => {
    it('of two tabs ending the same phase, only one chimes and notifies', async () => {
      setLocks(fakeLocks())
      chime.arm()
      await flush()
      phaseEnded(end(5)) // tab A
      resetAlerts() // tab B is a separate module instance with its own memory
      phaseEnded(end(5))
      await flush()
      expect(plays()).toBe(1)
      expect(shown).toHaveLength(1)
    })

    it('a later phase alerts normally, also while the first claim is still held', async () => {
      setLocks(fakeLocks())
      chime.arm()
      await flush()
      phaseEnded(end(5))
      phaseEnded(end(6))
      await flush()
      expect(plays()).toBe(2)
      expect(shown).toHaveLength(2)
    })

    it('releases the claim after CLAIM_HOLD_MS', async () => {
      const locks = fakeLocks()
      setLocks(locks)
      const fn = vi.fn()
      claim('sound', 9, fn)
      await flush()
      claim('sound', 9, fn)
      await flush()
      expect(fn).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(CLAIM_HOLD_MS)
      claim('sound', 9, fn)
      await flush()
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('an unarmed tab never claims the sound, so an armed tab still plays', async () => {
      setLocks(fakeLocks())
      phaseEnded(end(7)) // unarmed tab ends the phase first: notification only
      await flush()
      expect(plays()).toBe(0)
      resetAlerts()
      chime.arm()
      await flush()
      phaseEnded(end(7)) // armed tab: sound is still free
      await flush()
      expect(plays()).toBe(1)
      expect(shown).toHaveLength(1)
    })

    it('sound and notification are claimed separately', async () => {
      setLocks(fakeLocks())
      const sound = vi.fn()
      const notice = vi.fn()
      claim('sound', 1, sound)
      claim('notify', 1, notice)
      await flush()
      expect(sound).toHaveBeenCalledTimes(1)
      expect(notice).toHaveBeenCalledTimes(1)
    })
  })

  describe('without Web Locks', () => {
    it('runs directly and passes the tag so the notification still dedupes', async () => {
      chime.arm()
      await flush()
      phaseEnded(end(4))
      await flush()
      expect(plays()).toBe(1)
      expect(shown[0]?.options).toEqual({ tag: 'pomodoro-timer:4' })
    })

    it('runs directly when request throws', () => {
      setLocks({
        request: () => {
          throw new DOMException('insecure', 'SecurityError')
        },
      })
      const fn = vi.fn()
      claim('notify', 1, fn)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('runs directly when request rejects, once', async () => {
      setLocks({ request: () => Promise.reject(new Error('nope')) })
      const fn = vi.fn()
      claim('notify', 1, fn)
      await flush()
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })
})
