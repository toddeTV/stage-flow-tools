import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

describe('Nuxt i18n browser detection', () => {
  it('detects only at the root without creating or reading the legacy cookie', () => {
    const config = readFileSync(resolve(repoRoot, 'nuxt.config.ts'), 'utf8')

    expect(config).toContain("cookieKey: 'i18n_redirected_disabled'")
    expect(config).toContain("fallbackLocale: 'en'")
    expect(config).toContain("redirectOn: 'root'")
    expect(config).toContain('useCookie: false')
  })
})
