import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const workflowPath = '.github/workflows/deploy-maintainer.yml'
const environmentExamplePath = '.env.example'
const maintainerConfigHeader = '# --- GitHub Actions maintainer repository config (not application runtime config)'

function readFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('maintainer deployment workflow', () => {
  it('builds and deploys the manually selected source ref', () => {
    const workflow = readFile(workflowPath)

    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('source_ref:')
    expect(workflow).toContain('default: main')
    expect(workflow).toContain('DEPLOY_SOURCE_REF: ${{ inputs.source_ref }}')
    expect(workflow).not.toContain('push:')
    expect(workflow).toContain('timeout-minutes: 45')
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('ref: ${{ inputs.source_ref }}')
    expect(workflow).toContain('fetch-depth: 0')
    expect(workflow).not.toContain('ref: main')
    expect(workflow).toContain('persist-credentials: false')
    expect(workflow).toContain('stage-flow-tools:deploy-$deploy_sha')
    expect(workflow).toContain('stage-flow-tools:latest')
    expect(workflow).toContain('org.opencontainers.image.revision=$DEPLOY_SHA')
    expect(workflow).toContain('deploy_date="$(date --utc +%F)"')
    expect(workflow).toContain('deploy_short_sha="$(git rev-parse --short=7 HEAD)"')
    expect(workflow).toContain('deploy_version="$deploy_date-$deploy_short_sha"')
    expect(workflow).toContain('DEPLOY_VERSION=$deploy_version')
    expect(workflow).toContain('--build-arg "STAGE_FLOW_BUILD_VERSION=$DEPLOY_VERSION"')
    expect(workflow).toContain('/api/questions/active')
  })

  it('uses a published matching release tag and aborts on invalid release refs', () => {
    const workflow = readFile(workflowPath)
    const versionStep = workflow.slice(
      workflow.indexOf('      - name: Record selected revision'),
      workflow.indexOf('      - name: Build Docker image'),
    )

    expect(versionStep).toContain('GH_TOKEN: ${{ github.token }}')
    expect(versionStep).toContain('refs/tags/v*')
    expect(versionStep).toContain('git show-ref --verify --quiet "refs/tags/$DEPLOY_SOURCE_REF"')
    expect(versionStep).toContain('tag_sha="$(git rev-parse --verify "refs/tags/$selected_tag^{commit}")"')
    expect(versionStep).toContain('if [[ "$tag_sha" != "$deploy_sha" ]]')
    expect(versionStep).toContain('if [[ "$selected_tag" != "v$package_version" ]]')
    expect(versionStep).toContain('gh release view "$selected_tag"')
    expect(versionStep).toContain('select(.isDraft == false)')
    expect(versionStep).toContain('if [[ "$published_tag" != "$selected_tag" ]]')
    expect(versionStep).toContain('deploy_version="$package_version"')
    expect(versionStep).toContain('exit 1')
  })

  it('transfers the image with a pinned SSH identity and restarts the server wrapper', () => {
    const workflow = readFile(workflowPath)

    expect(workflow).toContain('MAINTAINER_DEPLOY_RESTART_COMMAND')
    expect(workflow).not.toContain('MAINTAINER_DEPLOY_COMPOSE_PATH')
    expect(workflow).toContain('MAINTAINER_DEPLOY_SSH_PRIVATE_KEY')
    expect(workflow).toContain('MAINTAINER_DEPLOY_SSH_KNOWN_HOSTS')
    expect(workflow).toContain('BatchMode=yes')
    expect(workflow).toContain('StrictHostKeyChecking=yes')
    expect(workflow).toContain('UserKnownHostsFile=')
    expect(workflow).not.toContain('sshpass')
    expect(workflow).not.toContain('StrictHostKeyChecking=accept-new')
    expect(workflow).toContain('docker image load')
    expect(workflow).toContain('docker image save "$IMAGE_REF" | gzip --stdout > "$IMAGE_ARCHIVE"')
    expect(workflow).not.toContain('docker image save "$IMAGE_REF" stage-flow-tools:latest')
    expect(workflow).toContain('sha256sum "$IMAGE_ARCHIVE"')
    expect(workflow).toContain('IMAGE_ARCHIVE_SHA256=$image_archive_sha256')
    expect(workflow).toContain('sha256sum "$archive_path"')
    expect(workflow).toContain('Deployment archive checksum mismatch.')
    expect(workflow).toContain('bash -n -c "$restart_command"')
    expect(workflow).toContain('bash -o errexit -o nounset -o pipefail -c "$restart_command"')
    expect(workflow).not.toContain('docker compose')
    expect(workflow).not.toContain('expected_image_id')
    expect(workflow).toContain('Loaded image revision does not match the selected revision.')
    expect(workflow).toContain('docker image tag "$image_ref" stage-flow-tools:latest')
    expect(workflow).toContain('Latest tag does not reference the verified deployment image.')
    expect(workflow).toContain('- name: Remove remote deployment archive\n        if: always()')
    expect(workflow).toContain('rm -f -- "$remote_archive"')
    expect(workflow).not.toContain('docker image prune')
    expect(workflow).not.toContain('docker logs')
  })

  it('transports restart commands containing shell operators as one SSH argument', () => {
    const restartCommand = 'cd /srv/stage-flow-tools && ./bin.py stop && ./bin.py start'
    const restartCommandBase64 = Buffer.from(restartCommand).toString('base64')
    const workflow = readFile(workflowPath)

    expect(restartCommandBase64).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(restartCommandBase64).not.toContain('&&')
    expect(Buffer.from(restartCommandBase64, 'base64').toString()).toBe(restartCommand)
    expect(workflow).toContain('base64 --wrap=0')
    expect(workflow).toContain('base64 --decode')
    expect(workflow).toContain('bash -s -- "$restart_command_base64"')
    expect(workflow).not.toContain('bash -s -- "$MAINTAINER_DEPLOY_RESTART_COMMAND"')
  })

  it('documents the maintainer repository configuration at the end of the environment contract', () => {
    const environmentExample = readFile(environmentExamplePath)
    const maintainerConfigIndex = environmentExample.indexOf(maintainerConfigHeader)

    expect(maintainerConfigIndex).toBeGreaterThan(environmentExample.indexOf('NUXT_PUBLIC_WS_URL='))
    expect(environmentExample).toContain('RELEASE_BOT_PAT_TOKEN=')
    expect(environmentExample).toContain('MAINTAINER_DEPLOY_SSH_HOST=')
    expect(environmentExample).toContain('MAINTAINER_DEPLOY_SSH_USER=')
    expect(environmentExample).toContain('MAINTAINER_DEPLOY_RESTART_COMMAND=')
    expect(environmentExample).toContain('MAINTAINER_DEPLOY_SSH_KNOWN_HOSTS=')
    expect(environmentExample).toContain('MAINTAINER_DEPLOY_SSH_PRIVATE_KEY=')
    expect(environmentExample.lastIndexOf(maintainerConfigHeader)).toBe(maintainerConfigIndex)
  })
})
