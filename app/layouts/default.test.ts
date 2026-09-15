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
const constrainedPageSources = [
  readSource('../pages/login.vue'),
  readSource('../pages/index.vue'),
  readSource('../pages/admin/index.vue'),
  readSource('../pages/admin/database.vue'),
  readSource('../pages/admin/questions.vue'),
  readSource('../pages/admin/results.vue'),
]

describe('default layout', () => {
  it('keeps page containers at their intended widths while main consumes free space before the footer', () => {
    expect(globalStylesSource).toContain('min-h-dvh')
    expect(defaultLayoutSource).toContain('<div class="flex min-h-dvh flex-col"')
    expect(defaultLayoutSource).toContain('<main class="flex flex-1 flex-col">')
    expect(defaultLayoutSource.indexOf('<main')).toBeLessThan(defaultLayoutSource.indexOf('<AppFooter'))

    for (const source of constrainedPageSources) {
      expect(source).toMatch(/<template>\s*<div[^>]+(?:class|:class)="[^"]*w-full/)
    }
  })

  it('keeps footer-enabled pages from reserving a second viewport height', () => {
    for (const source of footerPageSources) {
      expect(source).not.toContain('min-h-screen')
    }

    for (const source of displayPageSources) {
      expect(source).toMatch(/<template>\s*<div class="(?:leaderboard-page|recap-page) flex-1"/)
    }
  })
})
