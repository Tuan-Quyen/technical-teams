import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPermission, show, support } from './notify.ts'

function stub(permission: NotificationPermission, requestPermissionImpl?: unknown) {
  const ctor = Object.assign(vi.fn(), {
    permission: permission,
    requestPermission: requestPermissionImpl,
  })
  vi.stubGlobal('Notification', ctor)
  return ctor
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('support', () => {
  it('reports unsupported when the API is missing', () => {
    vi.stubGlobal('Notification', undefined)
    expect(support()).toBe('unsupported')
  })
  it.each(['default', 'granted', 'denied'] as const)('reports %s', (p) => {
    stub(p)
    expect(support()).toBe(p)
  })
})

describe('requestPermission', () => {
  it('resolves with the new permission (promise form)', async () => {
    const ctor = stub('default')
    ctor.requestPermission = vi.fn(() => {
      Object.assign(ctor, { permission: 'granted' })
      return Promise.resolve('granted')
    })
    await expect(requestPermission()).resolves.toBe('granted')
  })
  it('resolves when the answer comes through the callback (older Safari)', async () => {
    const ctor = stub('default')
    ctor.requestPermission = vi.fn((cb: () => void) => {
      Object.assign(ctor, { permission: 'denied' })
      cb()
    })
    await expect(requestPermission()).resolves.toBe('denied')
  })
  it('stays default when the prompt is dismissed', async () => {
    stub(
      'default',
      vi.fn(() => Promise.resolve('default')),
    )
    await expect(requestPermission()).resolves.toBe('default')
  })
  it('never rejects: a rejection or a throw resolves to the current state', async () => {
    stub(
      'default',
      vi.fn(() => Promise.reject(new Error('boom'))),
    )
    await expect(requestPermission()).resolves.toBe('default')
    stub(
      'default',
      vi.fn(() => {
        throw new TypeError('not allowed')
      }),
    )
    await expect(requestPermission()).resolves.toBe('default')
  })
  it('does not prompt again when already decided or unsupported', async () => {
    const ask = vi.fn()
    stub('granted', ask)
    await expect(requestPermission()).resolves.toBe('granted')
    stub('denied', ask)
    await expect(requestPermission()).resolves.toBe('denied')
    vi.stubGlobal('Notification', undefined)
    await expect(requestPermission()).resolves.toBe('unsupported')
    expect(ask).not.toHaveBeenCalled()
  })
})

describe('show', () => {
  it('creates a title-only notification tagged with the phase id', () => {
    const ctor = stub('granted')
    expect(show('Focus finished — Short Break next', 7)).toBe(true)
    expect(ctor).toHaveBeenCalledWith('Focus finished — Short Break next', {
      tag: 'pomodoro-timer:7',
    })
  })
  it('returns false instead of throwing', () => {
    vi.stubGlobal(
      'Notification',
      vi.fn(() => {
        throw new TypeError('Illegal constructor')
      }),
    )
    expect(show('x', 1)).toBe(false)
  })
})
