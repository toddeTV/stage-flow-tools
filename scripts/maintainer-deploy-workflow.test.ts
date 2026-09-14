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
  it('builds and deploys only the current main revision', () => {
    const workflow = readFile(workflowPath)

    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).not.toContain('push:')
    expect(workflow).toContain('timeout-minutes: 45')
    expect(workflow).toContain('cancel-in-progress: false')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('ref: main')
    expect(workflow).toContain('persist-credentials: false')
    expect(workflow).toContain('stage-flow-tools:main-$main_sha')
    expect(workflow).toContain('stage-flow-tools:latest')
    expect(workflow).toContain('org.opencontainers.image.revision=$MAIN_SHA')
    expect(workflow).toContain('/api/questions/active')
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
    expect(workflow).toContain('bash -n -c "$restart_command"')
    expect(workflow).toContain('bash -o errexit -o nounset -o pipefail -c "$restart_command"')
    expect(workflow).not.toContain('docker compose')
    expect(workflow).toContain('expected_image_id')
    expect(workflow).toContain('- name: Remove remote deployment archive\n        if: always()')
    expect(workflow).toContain('rm -f -- "$remote_archive"')
    expect(workflow).not.toContain('docker image prune')
    expect(workflow).not.toContain('docker logs')
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
