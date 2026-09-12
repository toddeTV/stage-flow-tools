import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const composePath = 'docker-compose.yml'

function readFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('Docker Compose runtime configuration', () => {
  it('loads the runtime environment and rejects known production defaults', () => {
    const compose = readFile(composePath)

    expect(compose).toContain('env_file:\n      - .env')
    expect(compose).toContain('$$NUXT_ADMIN_PASSWORD')
    expect(compose).toContain('$$NUXT_JWT_SECRET')
    expect(compose).toContain('NUXT_ADMIN_PASSWORD must be set to a non-default production value.')
    expect(compose).toContain('NUXT_JWT_SECRET must be set to a non-default production value.')
    expect(compose).toContain('exec node .output/server/index.mjs')
  })
})
