import { afterEach, describe, expect, it, vi } from 'vitest'
import * as fullscreen from './fullscreen.ts'

function stubApi(opts: { enabled: boolean; request?: () => Promise<void>; active?: boolean }) {
  Object.defineProperty(document, 'fullscreenEnabled', { value: opts.enabled, configurable: true })
  Object.defineProperty(document, 'fullscreenElement', {
    value: opts.active ? document.documentElement : null,
    configurable: true,
  })
  const request = vi.fn(opts.request ?? (() => Promise.resolve()))
  document.documentElement.requestFullscreen = request
  const exitFn = vi.fn(() => Promise.resolve())
  document.exitFullscreen = exitFn
  return { request, exitFn }
}

afterEach(() => {
  Reflect.deleteProperty(document, 'fullscreenEnabled')
  Reflect.deleteProperty(document, 'fullscreenElement')
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
})

describe('fullscreen service (POMO-E7)', () => {
  it('is unsupported and resolves false when the API is absent (jsdom)', async () => {
    expect(fullscreen.isSupported()).toBe(false)
    await expect(fullscreen.enter()).resolves.toBe(false)
    await expect(fullscreen.exit()).resolves.toBeUndefined()
  })

  it('requests fullscreen on <html> and resolves true', async () => {
    const { request } = stubApi({ enabled: true })
    expect(fullscreen.isSupported()).toBe(true)
    await expect(fullscreen.enter()).resolves.toBe(true)
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('resolves false instead of rejecting when the browser refuses', async () => {
    stubApi({ enabled: true, request: () => Promise.reject(new TypeError('denied')) })
    await expect(fullscreen.enter()).resolves.toBe(false)
  })

  it('resolves false when fullscreenEnabled is false', async () => {
    const { request } = stubApi({ enabled: false })
    await expect(fullscreen.enter()).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
  })

  it('exit leaves only while active and swallows errors', async () => {
    const idle = stubApi({ enabled: true })
    await fullscreen.exit()
    expect(idle.exitFn).not.toHaveBeenCalled()

    const active = stubApi({ enabled: true, active: true })
    active.exitFn.mockRejectedValueOnce(new TypeError('x'))
    await expect(fullscreen.exit()).resolves.toBeUndefined()
    expect(active.exitFn).toHaveBeenCalledTimes(1)
  })

  it('onChange subscribes to fullscreenchange and unsubscribes', () => {
    const cb = vi.fn()
    const off = fullscreen.onChange(cb)
    document.dispatchEvent(new Event('fullscreenchange'))
    off()
    document.dispatchEvent(new Event('fullscreenchange'))
    expect(cb).toHaveBeenCalledTimes(1)
  })
})
