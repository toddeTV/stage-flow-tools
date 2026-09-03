import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

function readPage(name: string) {
  return readFileSync(fileURLToPath(new URL(`./${name}.vue`, import.meta.url)), 'utf8')
}

describe('public legal pages', () => {
  it('keeps the legal notice English-only with its German legal term', () => {
    const source = readPage('legal-notice')

    expect(source).toContain("title: 'Legal Notice (Impressum)'")
    expect(source).toContain("key: 'legal-notice'")
    expect(source).toContain('localeSwitcher: false')
  })

  it('keeps the privacy policy English-only with its German legal term', () => {
    const source = readPage('privacy-policy')

    expect(source).toContain("title: 'Privacy Policy (Datenschutzerklärung)'")
    expect(source).toContain("key: 'privacy-policy'")
    expect(source).toContain('localeSwitcher: false')
  })
})
