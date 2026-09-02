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

  it('installs the generated hook after the Vite+ dispatcher', () => {
    const root = createTemporaryRoot()

    installVitePlusPreCommitDispatcher(root)
    installThirdPartyNoticesHook(root)

    const content = preCommitHookContent()
    const installedContent = readFileSync(resolve(root, '.vite-hooks/pre-commit'), 'utf8')

    expect(content).toContain(noticesHookMarker)
    expect(content).toContain('vp run notices:generate')
    expect(content).toContain('git add -- THIRD_PARTY_NOTICES.md')
    expect(content).toContain('package.json')
    expect(content).toContain('pnpm-lock.yaml')
    expect(content).toContain('pnpm-workspace.yaml')
    expect(content).toContain('scripts/write-third-party-notices.ts')
    expect(content).toContain('vp staged')
    expect(installedContent).toBe(content)
    expect(content.match(/git add -- [^\n]+/gu)).toEqual([
      'git add -- THIRD_PARTY_NOTICES.md',
    ])
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
