import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function readFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('embedded build version contract', () => {
  it('defines a compile-time version with a local UTC fallback', () => {
    const nuxtConfig = readFile('nuxt.config.ts')
    const viteConfig = readFile('vite.config.ts')
    const footer = readFile('app/components/app/AppFooter.vue')
    const declaration = readFile('app/build-version.d.ts')

    expect(nuxtConfig).toContain('new Date().toISOString().slice(0, 10)}-local')
    expect(nuxtConfig).toContain('process.env.STAGE_FLOW_BUILD_VERSION?.trim() || defaultBuildVersion')
    expect(nuxtConfig).toContain('__STAGE_FLOW_BUILD_VERSION__: JSON.stringify(buildVersion)')
    expect(nuxtConfig).not.toContain('version,')
    expect(viteConfig).toContain("command: 'cross-env NODE_OPTIONS=--max-old-space-size=8192 nuxt build'")
    expect(viteConfig).toContain('cache: { scripts: true, tasks: false }')
    expect(viteConfig).toContain("'STAGE_FLOW_BUILD_VERSION'")
    expect(footer).toContain('const appVersion = __STAGE_FLOW_BUILD_VERSION__')
    expect(footer).not.toContain('useRuntimeConfig')
    expect(declaration).toContain('declare const __STAGE_FLOW_BUILD_VERSION__: string')
  })

  it('accepts the version only in the Docker build stage', () => {
    const dockerfile = readFile('Dockerfile')
    const productionStage = dockerfile.slice(dockerfile.indexOf('FROM node:26.8.2-alpine AS production'))

    expect(dockerfile).toContain('ARG STAGE_FLOW_BUILD_VERSION')
    expect(dockerfile.indexOf('ARG STAGE_FLOW_BUILD_VERSION')).toBeLessThan(
      dockerfile.indexOf('RUN vp run build'),
    )
    expect(productionStage).not.toContain('STAGE_FLOW_BUILD_VERSION')
    expect(productionStage).not.toContain('ENV ')
  })

  it('includes the Vite task configuration in the Docker build context', () => {
    expect(readFile('.dockerignore')).toContain('!vite.config.ts')
  })

  it('passes a UTC local version into the local Docker build', () => {
    const buildScript = readFile('docker-build.sh')

    expect(buildScript).toContain('build_version="$(date -u +%F)-local"')
    expect(buildScript).toContain('--build-arg "STAGE_FLOW_BUILD_VERSION=$build_version"')
  })

  it('does not expose a runtime environment override', () => {
    expect(readFile('.env.example')).not.toContain('NUXT_PUBLIC_VERSION')
  })
})
