import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import {
  join,
  resolve,
} from 'node:path'
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vite-plus/test'

import {
  assertVitePlusHooksInstalled,
  commitMessageHookContent,
  commitMessageHookMarker,
  installThirdPartyNoticesHook,
  noticesHookMarker,
  noticesTriggerPattern,
  preCommitHookContent,
  thirdPartyNoticesHookStatusChecks,
} from './install-third-party-notices-hook'

const temporaryDirectories: string[] = []

function createTemporaryRoot() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-notices-hook-'))

  temporaryDirectories.push(directory)

  return directory
}

function installVitePlusPreCommitDispatcher(root: string) {
  const dispatcher = resolve(root, '.vite-hooks/_/pre-commit')

  mkdirSync(resolve(root, '.vite-hooks/_'), { recursive: true })
  writeFileSync(dispatcher, '#!/bin/sh\n')
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      force: true,
      recursive: true,
    })
  }
})

describe('third-party notices hook', () => {
  it('exposes the documented dispatcher recovery commands', () => {
    const packageJson = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { scripts: Record<string, string> }

    expect(packageJson.scripts).toMatchObject({
      'hooks:install': 'vp run hooks:install:vite-plus && vp run notices:hook:install',
      'hooks:install:vite-plus': 'vp config --hooks-only',
      'prepare': 'vp run hooks:install',
    })
  })

  it('requires the Vite+ pre-commit dispatcher', () => {
    const root = createTemporaryRoot()

    expect(() => assertVitePlusHooksInstalled(root)).toThrow(
      /Vite\+ pre-commit dispatcher is missing/u,
    )
  })

  it('installs the generated hooks after the Vite+ dispatcher', () => {
    const root = createTemporaryRoot()

    installVitePlusPreCommitDispatcher(root)
    installThirdPartyNoticesHook(root)

    const preCommitContent = preCommitHookContent()
    const commitMessageContent = commitMessageHookContent()
    const installedPreCommitContent = readFileSync(resolve(root, '.vite-hooks/pre-commit'), 'utf8')
    const installedCommitMessageContent = readFileSync(resolve(root, '.vite-hooks/commit-msg'), 'utf8')

    expect(preCommitContent).toContain(noticesHookMarker)
    expect(preCommitContent).toContain('vp run notices:generate')
    expect(preCommitContent).toContain('git add -- THIRD_PARTY_NOTICES.md')
    expect(preCommitContent).toContain('package.json')
    expect(preCommitContent).toContain('pnpm-lock.yaml')
    expect(preCommitContent).toContain('pnpm-workspace.yaml')
    expect(preCommitContent).toContain('scripts/write-third-party-notices.ts')
    expect(preCommitContent).toContain('vp staged')
    expect(commitMessageContent).toContain(commitMessageHookMarker)
    expect(installedPreCommitContent).toBe(preCommitContent)
    expect(installedCommitMessageContent).toBe(commitMessageContent)
    expect(preCommitContent.match(/git add -- [^\n]+/gu)).toEqual([
      'git add -- THIRD_PARTY_NOTICES.md',
    ])
  })

  it('accepts one scope-free Conventional Commit subject only', () => {
    const root = createTemporaryRoot()

    installVitePlusPreCommitDispatcher(root)
    installThirdPartyNoticesHook(root)

    const hook = resolve(root, '.vite-hooks/commit-msg')
    const message = resolve(root, 'commit-message')

    writeFileSync(message, 'feat: add quick hooks\n')
    expect(() => execFileSync('sh', [
      hook,
      message,
    ])).not.toThrow()

    writeFileSync(message, 'security: patch token validation\n')
    expect(() => execFileSync('sh', [
      hook,
      message,
    ])).not.toThrow()

    writeFileSync(message, 'feat(scope): reject slow hooks\n')
    expect(() => execFileSync('sh', [
      hook,
      message,
    ], { stdio: 'pipe' })).toThrow()

    writeFileSync(message, 'feat: allow this\n\nExplain more\n')
    expect(() => execFileSync('sh', [
      hook,
      message,
    ], { stdio: 'pipe' })).toThrow()
  })

  it('triggers only for package declarations, lockfiles, or generator changes', () => {
    const trigger = new RegExp(`^(${noticesTriggerPattern})$`, 'u')

    expect(trigger.test('package.json')).toBe(true)
    expect(trigger.test('pnpm-lock.yaml')).toBe(true)
    expect(trigger.test('pnpm-workspace.yaml')).toBe(true)
    expect(trigger.test('scripts/write-third-party-notices.ts')).toBe(true)
    expect(trigger.test('README.md')).toBe(false)
    expect(trigger.test('scripts/install-third-party-notices-hook.ts')).toBe(false)
  })

  it('blocks notice generation when a trigger input has unstaged changes', () => {
    const content = preCommitHookContent()
    const guardIndex = content.indexOf('UNSTAGED_TRIGGER=$(git diff --name-only --')
    const generatorIndex = content.indexOf('vp run notices:generate')

    expect(content).toContain(
      'git diff --name-only -- package.json pnpm-lock.yaml pnpm-workspace.yaml scripts/write-third-party-notices.ts',
    )
    expect(content).toContain('Refusing to refresh notices with unstaged trigger inputs.')
    expect(content).toContain('Stage, stash, or discard those changes, then retry.')
    expect(guardIndex).toBeGreaterThan(-1)
    expect(guardIndex).toBeLessThan(generatorIndex)
  })

  it('reports every installed hook requirement as ready', () => {
    const root = createTemporaryRoot()

    installVitePlusPreCommitDispatcher(root)
    installThirdPartyNoticesHook(root)

    expect(thirdPartyNoticesHookStatusChecks(root)).toEqual([
      {
        ok: true,
        text: '.vite-hooks/_/pre-commit dispatcher exists',
      },
      {
        ok: true,
        text: '.vite-hooks/commit-msg contains Conventional Commit marker',
      },
      {
        ok: true,
        text: '.vite-hooks/commit-msg enforces one scoped-free Conventional Commit subject',
      },
      {
        ok: true,
        text: '.vite-hooks/pre-commit contains third-party notice marker',
      },
      {
        ok: true,
        text: '.vite-hooks/pre-commit runs third-party notice generation',
      },
      {
        ok: true,
        text: '.vite-hooks/pre-commit stages THIRD_PARTY_NOTICES.md only',
      },
      {
        ok: true,
        text: '.vite-hooks/pre-commit lists every third-party notice trigger',
      },
    ])
  })
})
