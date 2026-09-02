import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const bootstrapKey = [
  'vite-plus-bootstrap-v1-${{ runner.os }}-${{ runner.arch }}',
  'vp-0.3.0-node-${{ steps.setup-node.outputs.node-version }}',
].join('-')
const compositeActionPath = '.github/actions/setup-vite-plus-ci/action.yml'
const fallbackWorkflowPath = '.github/workflows/verify-vite-plus-bootstrap-fallback.yml'
const validationWorkflowPath = '.github/workflows/validation-and-tests.yml'

function readFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('Vite+ CI bootstrap', () => {
  it('keeps system-Node Vite+ setup in one pinned composite action', () => {
    const action = readFile(compositeActionPath)
    const vitePlusSetup = action.slice(
      action.indexOf('- name: Setup Vite+'),
      action.indexOf('- name: Verify Vite+ System Node'),
    )

    expect(action).toContain('using: composite')
    expect(action).toContain('used-cached-fallback:')
    expect(action).toContain('uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020')
    expect(action).toContain('node-version: "24"\n        package-manager-cache: false')
    expect(action).toContain('uses: actions/cache/restore@55cc8345863c7cc4c66a329aec7e433d2d1c52a9')
    expect(action).toContain('uses: actions/cache/save@55cc8345863c7cc4c66a329aec7e433d2d1c52a9')
    expect(action).toContain('uses: voidzero-dev/setup-vp@35171c92dd08b67d5a9d3f2a4327800e58396f2a')
    expect(action).toContain(`key: ${bootstrapKey}`)
    expect(action).toContain('VP_NODE_MANAGER: no')
    expect(action).toContain('vp env off')
    expect(action).toContain('id: validate-vite-plus-bootstrap-cache')
    expect(action).toContain('id: restore-vite-plus-bootstrap-fallback')
    expect(action).toContain('id: validate-vite-plus-bootstrap-fallback')
    expect(action).toContain("steps.setup-vite-plus.outcome == 'failure'")
    expect(action).toContain('used-cached-fallback=true')
    expect(action).toContain('cached_vite_plus_version="$("$cached_vite_plus_bin" --version)"')
    expect(action).toContain('fallback_vite_plus_version="$("$fallback_vite_plus_bin" --version)"')
    expect(action).not.toContain('VP_NODE_DIST_MIRROR')
    expect(action).not.toContain('--version | grep -Fxq')
    expect(vitePlusSetup).not.toContain('node-version:')
  })

  it('invokes the bounded bootstrap before installing dependencies', () => {
    const workflow = readFile(validationWorkflowPath)
    const bootstrapIndex = workflow.indexOf('- name: Setup Node and Vite+')

    expect(workflow).toContain('name: Setup Node and Vite+\n        timeout-minutes: 3')
    expect(workflow).toContain('uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0')
    expect(workflow).toContain('uses: ./.github/actions/setup-vite-plus-ci')
    expect(bootstrapIndex).toBeGreaterThan(-1)
    expect(bootstrapIndex).toBeLessThan(workflow.indexOf('- name: Install Dependencies'))
    expect(workflow).not.toContain('voidzero-dev/setup-vp@')
    expect(workflow).not.toContain('vp run graphify:test')
    expect(workflow).not.toContain('warning_summary')
    expect(workflow.match(/^\s+command: /gm)).toHaveLength(5)
  })

  it('provides a manual warm-cache installer-failure validation workflow', () => {
    const workflow = readFile(fallbackWorkflowPath)

    expect(workflow).toContain('workflow_dispatch: {}')
    expect(workflow).toContain('uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0')
    expect(workflow).toContain('uses: ./.github/actions/setup-vite-plus-ci')
    expect(workflow).toContain("'exit 1' > \"$fake_bin/curl\"")
    expect(workflow).toContain("test '${{ steps.fallback.outputs.used-cached-fallback }}' = 'true'")
    expect(workflow).toContain('vite_plus_version="$(vp --version)"')
    expect(workflow).not.toContain('secrets.')
    expect(workflow).not.toContain('vp --version | grep -Fxq')
  })
})
