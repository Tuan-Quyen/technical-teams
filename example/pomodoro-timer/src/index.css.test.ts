/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(import.meta.dirname, 'index.css'), 'utf8')

// jsdom does not run CSS transitions; these pin the rules that implement them.
describe('index.css motion rules (E11)', () => {
  it('registers --accent and crossfades it over 600 ms', () => {
    expect(css).toMatch(/@property --accent\s*{[^}]*syntax:\s*'<color>'/)
    expect(css).toMatch(/transition:\s*--accent 600ms/)
  })

  it('snaps the accent under prefers-reduced-motion', () => {
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*{\s*:root\s*{\s*transition:\s*none;/,
    )
  })

  it('swaps the accent by data-phase and keeps a default', () => {
    for (const p of ['focus', 'short', 'long']) {
      expect(css).toContain(`:root[data-phase='${p}']`)
    }
    expect(css).toMatch(/:root\s*{\s*--accent:/)
  })

  it('self-hosts Inter with font-display: swap and the system fallback stack', () => {
    const face = /@font-face\s*{[^}]*}/.exec(css)?.[0] ?? ''
    expect(face).toContain("font-family: 'Inter Variable'")
    expect(face).toContain('InterVariable.woff2')
    expect(face).toMatch(/font-weight:\s*100 900/)
    expect(face).toMatch(/font-display:\s*swap/)
    expect(css).toMatch(
      /--font-sans:[^;]*'Inter Variable'[^;]*ui-sans-serif, system-ui, sans-serif/,
    )
  })
})
