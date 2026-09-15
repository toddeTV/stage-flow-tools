import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const releaseWorkflowPath = '.github/workflows/release.yml'
const dockerSmokeWorkflowPath = '.github/workflows/docker-smoke.yml'
const releaseConfigPath = 'release-please-config.json'
const releaseDocsPath = 'docs/release-flow.md'
const environmentExamplePath = '.env.example'
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
    expect(releaseJob).toContain('fine-grained personal access token')
    expect(releaseJob).not.toContain('PAT or GitHub App token')
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

    expect([
      {},
      { '.': '1.0.0' },
    ]).toContainEqual(manifest)
    expect(config.packages['.']['release-as']).toBe('1.0.0')
  })

  it('declares the release bot secret in the maintainer repository configuration', () => {
    const environmentExample = readFile(environmentExamplePath)

    expect(environmentExample).toContain('GitHub Actions maintainer repository config')
    expect(environmentExample).toContain('RELEASE_BOT_PAT_TOKEN=')
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
    expect(dockerMetadata).not.toContain('latest=')
  })

  it('builds and smoke-tests the Release Please source SHA', () => {
    const workflow = readFile(releaseWorkflowPath)
    const smokeWorkflow = readFile(dockerSmokeWorkflowPath)
    const releaseJob = releasePleaseJob(workflow)
    const dockerPublishJob = workflow.slice(
      workflow.indexOf('  publish-docker-image:'),
      workflow.indexOf('  docker-smoke:'),
    )

    expect(releaseJob).toContain('release_sha: ${{ steps.release.outputs.sha }}')
    expect(dockerPublishJob).toContain('ref: ${{ needs.release-please.outputs.release_sha }}')
    expect(dockerPublishJob).toContain('id: embedded-version')
    expect(dockerPublishJob).toContain('package_version="$(jq --raw-output \'.version\' package.json)"')
    expect(dockerPublishJob).toContain('test "$RELEASE_TAG_NAME" = "v$package_version"')
    expect(dockerPublishJob).toContain('STAGE_FLOW_BUILD_VERSION=${{ steps.embedded-version.outputs.version }}')
    expect(dockerPublishJob).toContain('context: git')
    expect(workflow).toContain('release_sha: ${{ needs.release-please.outputs.release_sha }}')
    expect(workflow).toContain('release_tag: ${{ needs.release-please.outputs.tag_name }}')
    expect(smokeWorkflow).toContain('release_sha:')
    expect(smokeWorkflow).toContain('release_tag:')
    expect(smokeWorkflow).toContain('ref: ${{ inputs.release_sha || github.sha }}')
    expect(smokeWorkflow).toContain('build_version="$package_version"')
    expect(smokeWorkflow).toContain('build_version="$(date --utc +%F)-smoke-$(git rev-parse --short=7 HEAD)"')
    expect(smokeWorkflow).toContain('STAGE_FLOW_BUILD_VERSION=${{ steps.embedded-version.outputs.version }}')
    expect(smokeWorkflow).toContain('name: Start image and wait for the public API')
    expect(smokeWorkflow).not.toContain('docker compose')
    expect(smokeWorkflow.indexOf('Build Docker image')).toBeLessThan(
      smokeWorkflow.indexOf('Start image and wait for the public API'),
    )
  })

  it('documents the configured release PR title', () => {
    const releaseDocs = readFile(releaseDocsPath)

    expect(releaseDocs).toContain('`chore: release v${version}`')
    expect(releaseDocs).toContain('`chore: release v1.0.0`')
    expect(releaseDocs).not.toContain('chore(main): release')
    expect(releaseDocs).toContain('fine-grained personal access token')
    expect(releaseDocs).toContain('Do not store a GitHub App installation access token')
  })
})
