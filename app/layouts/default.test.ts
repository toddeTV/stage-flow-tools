import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

function readSource(path: string) {
  return readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
}

const defaultLayoutSource = readSource('./default.vue')
const globalStylesSource = readSource('../assets/css/main.css')
const footerPageSources = [
  readSource('../pages/index.vue'),
  readSource('../pages/admin/leaderboard.vue'),
  readSource('../pages/admin/recap.vue'),
]
const displayPageSources = footerPageSources.slice(1)

describe('default layout', () => {
  it('keeps page containers at their intended widths while main consumes free space before the footer', () => {
    expect(globalStylesSource).toContain('min-h-dvh')
    expect(defaultLayoutSource).toContain('<div class="flex min-h-dvh flex-col"')
    expect(defaultLayoutSource).toContain('<main class="flex-1">')
    expect(defaultLayoutSource.indexOf('<main')).toBeLessThan(defaultLayoutSource.indexOf('<AppFooter'))
  })

  it('keeps footer-enabled pages from reserving a second viewport height', () => {
    for (const source of footerPageSources) {
      expect(source).not.toContain('min-h-screen')
    }

    for (const source of displayPageSources) {
      expect(source).toContain('min-h-full')
    }
  })
})
