import { act, renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFullscreen } from './useFullscreen.ts'

let resolveRequest: () => void
let active: Element | null

beforeEach(() => {
  active = null
  Object.defineProperty(document, 'fullscreenEnabled', { value: true, configurable: true })
  Object.defineProperty(document, 'fullscreenElement', {
    get: () => active,
    configurable: true,
  })
  document.documentElement.requestFullscreen = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveRequest = () => {
          active = document.documentElement
          resolve()
        }
      }),
  )
  document.exitFullscreen = vi.fn(() => {
    active = null
    return Promise.resolve()
  })
})

afterEach(() => {
  Reflect.deleteProperty(document, 'fullscreenEnabled')
  Reflect.deleteProperty(document, 'fullscreenElement')
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
})

describe('useFullscreen', () => {
  it('closed before the browser answers: leaves fullscreen again once it is granted (POMO-R14)', async () => {
    const exitFullscreen = vi.fn(() => {
      active = null
      return Promise.resolve()
    })
    document.exitFullscreen = exitFullscreen
    const { result } = renderHook(() => useFullscreen())

    act(() => {
      result.current.enter()
    })
    expect(result.current.open).toBe(true)
    act(() => {
      result.current.exit() // nothing is fullscreen yet, so this exits nothing
    })
    expect(result.current.open).toBe(false)
    expect(exitFullscreen).not.toHaveBeenCalled()

    await act(async () => {
      resolveRequest()
      await Promise.resolve()
    })
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
    expect(result.current.open).toBe(false)
  })

  it('granted while open: becomes native, and the browser leaving fullscreen closes it', async () => {
    const { result } = renderHook(() => useFullscreen())
    act(() => {
      result.current.enter()
    })
    await act(async () => {
      resolveRequest()
      await Promise.resolve()
    })
    expect(result.current.open).toBe(true)
    active = null
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'))
    })
    expect(result.current.open).toBe(false)
  })

  it('unmounted while native: leaves fullscreen (REVI-R6)', async () => {
    const exitFullscreen = vi.fn(() => {
      active = null
      return Promise.resolve()
    })
    document.exitFullscreen = exitFullscreen
    const { result, unmount } = renderHook(() => useFullscreen())
    act(() => {
      result.current.enter()
    })
    await act(async () => {
      resolveRequest()
      await Promise.resolve()
    })
    expect(exitFullscreen).not.toHaveBeenCalled()
    unmount()
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('unmounted before the browser answers: leaves fullscreen once it is granted (REVI-R6)', async () => {
    const exitFullscreen = vi.fn(() => {
      active = null
      return Promise.resolve()
    })
    document.exitFullscreen = exitFullscreen
    const { result, unmount } = renderHook(() => useFullscreen())
    act(() => {
      result.current.enter()
    })
    unmount()
    expect(exitFullscreen).not.toHaveBeenCalled()
    await act(async () => {
      resolveRequest()
      await Promise.resolve()
    })
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('StrictMode: enter, grant, then unmount exits exactly once (REVI-R6)', async () => {
    const exitFullscreen = vi.fn(() => {
      active = null
      return Promise.resolve()
    })
    document.exitFullscreen = exitFullscreen
    const { result, unmount } = renderHook(() => useFullscreen(), { wrapper: StrictMode })
    act(() => {
      result.current.enter()
    })
    await act(async () => {
      resolveRequest()
      await Promise.resolve()
    })
    expect(exitFullscreen).not.toHaveBeenCalled()
    unmount()
    expect(exitFullscreen).toHaveBeenCalledTimes(1)
  })

  it('StrictMode double-mount does not exit anything (REVI-R6)', () => {
    const exitFullscreen = vi.fn(() => {
      active = null
      return Promise.resolve()
    })
    document.exitFullscreen = exitFullscreen
    renderHook(() => useFullscreen(), { wrapper: StrictMode })
    expect(exitFullscreen).not.toHaveBeenCalled()
  })
})
