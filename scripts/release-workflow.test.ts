import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const releaseWorkflowPath = '.github/workflows/release.yml'
const releaseConfigPath = 'release-please-config.json'
const releaseDocsPath = 'docs/release-flow.md'
const releaseTitlePattern = 'chore: release v${version}'
const releaseTagValue = 'value=${{ needs.release-please.outputs.tag_name }}'

function readFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

function releasePleaseJob(workflow: string) {
  return workflow.slice(
    workflow.indexOf('  release-please:'),
    workflow.indexOf('  publish-docker-image:'),
  )
}

describe('release workflow configuration', () => {
  it('uses the manifest configuration and release bot token', () => {
    const workflow = readFile(releaseWorkflowPath)
    const config = JSON.parse(readFile(releaseConfigPath)) as {
      packages: { '.': { 'pull-request-title-pattern': string } }
    }
    const releaseJob = releasePleaseJob(workflow)

    expect(config.packages['.']['pull-request-title-pattern']).toBe(releaseTitlePattern)
    expect(releaseJob).toContain('timeout-minutes: 15')
    expect(releaseJob).toContain('contents: write')
    expect(releaseJob).toContain('issues: write')
    expect(releaseJob).toContain('pull-requests: write')
    expect(releaseJob).not.toContain('packages: write')
    expect(releaseJob).toContain('RELEASE_BOT_PAT_TOKEN')
    expect(releaseJob).toContain('Missing RELEASE_BOT_PAT_TOKEN')
    expect(releaseJob).toContain('token: ${{ secrets.RELEASE_BOT_PAT_TOKEN }}')
    expect(releaseJob).toContain('config-file: release-please-config.json')
    expect(releaseJob).toContain('manifest-file: .release-please-manifest.json')
    expect(releaseJob).not.toContain('release-type:')
    expect(releaseJob).not.toContain('secrets.GITHUB_TOKEN')
  })

  it('bootstraps the first stable release without a fabricated manifest version', () => {
    const config = JSON.parse(readFile(releaseConfigPath)) as {
      packages: { '.': { 'release-as': string } }
    }
    const manifest = JSON.parse(readFile('.release-please-manifest.json')) as Record<string, string>

    expect(manifest).toEqual({})
    expect(config.packages['.']['release-as']).toBe('1.0.0')
  })

  it('derives Docker semver tags from the Release Please tag', () => {
    const workflow = readFile(releaseWorkflowPath)
    const dockerMetadata = workflow.slice(
      workflow.indexOf('- name: Extract metadata (tags, labels) for Docker'),
      workflow.indexOf('- name: Build and push Docker image'),
    )

    expect(dockerMetadata).toContain('type=semver,pattern={{version}},' + releaseTagValue)
    expect(dockerMetadata).toContain('type=semver,pattern={{major}}.{{minor}},' + releaseTagValue)
    expect(dockerMetadata).toContain('type=semver,pattern={{major}},' + releaseTagValue)
    expect(dockerMetadata).toContain('latest=auto')
  })

  it('documents the configured release PR title', () => {
    const releaseDocs = readFile(releaseDocsPath)

    expect(releaseDocs).toContain('`chore: release v${version}`')
    expect(releaseDocs).toContain('`chore: release v1.0.0`')
    expect(releaseDocs).not.toContain('chore(main): release')
  })
})
