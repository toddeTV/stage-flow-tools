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
import { fileURLToPath } from 'node:url'
import {
  afterEach,
  describe,
  expect,
  it,
} from 'vite-plus/test'

import {
  collectThirdPartyNoticeEntries,
  createThirdPartyNoticesForRepo,
} from './write-third-party-notices'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const temporaryDirectories: string[] = []

function createTemporaryRoot() {
  const directory = mkdtempSync(join(tmpdir(), 'stage-flow-tools-notices-'))

  temporaryDirectories.push(directory)

  return directory
}

function writePackageMetadata(root: string, name: string, metadata: Record<string, unknown>) {
  const packageRoot = resolve(root, 'node_modules', ...name.split('/'))

  mkdirSync(packageRoot, { recursive: true })
  writeFileSync(resolve(packageRoot, 'package.json'), JSON.stringify({
    name,
    ...metadata,
  }))
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, {
      force: true,
      recursive: true,
    })
  }
})

describe('third-party notice generation', () => {
  it('collects installed direct package metadata and ignores package manager and vp dlx tools', () => {
    const root = createTemporaryRoot()

    mkdirSync(resolve(root, 'node_modules'), { recursive: true })
    writeFileSync(resolve(root, 'package.json'), JSON.stringify({
      dependencies: {
        alpha: '^1.0.0',
      },
      devDependencies: {
        '@scope/beta': '~2.0.0',
        tsx: '~4.23.13',
      },
      packageManager: 'pnpm@10.33.0',
      peerDependencies: {
        gamma: '^3.0.0',
      },
      optionalDependencies: {
        delta: '^4.0.0',
      },
      scripts: {
        task: 'vp exec tsx scripts/task.ts && vp dlx @scope/tool@1.2.3 task',
      },
    }))
    writePackageMetadata(root, 'alpha', {
      homepage: 'https://stage-flow-tools.example/alpha',
      license: 'MIT',
      repository: {
        type: 'git',
        url: 'https://stage-flow-tools.example/alpha.git',
      },
      version: '1.2.3',
    })
    writeFileSync(resolve(root, 'node_modules/alpha/LICENSE'), 'license text')
    writeFileSync(resolve(root, 'node_modules/alpha/NOTICE'), 'notice text')
    writePackageMetadata(root, '@scope/beta', {
      license: {
        type: 'Apache-2.0',
      },
      version: '2.1.0',
    })
    writePackageMetadata(root, 'gamma', {
      license: 'BSD-3-Clause',
      version: '3.0.1',
    })
    writePackageMetadata(root, 'delta', {
      license: [
        'MIT',
        {
          type: 'ISC',
        },
      ],
      version: '4.0.2',
    })
    writePackageMetadata(root, 'tsx', {
      license: 'MIT',
      version: '4.23.13',
    })

    const entries = collectThirdPartyNoticeEntries({
      repoRoot: root,
    })

    expect(entries.map(entry => entry.name)).toEqual([
      '@scope/beta',
      'alpha',
      'delta',
      'gamma',
      'tsx',
    ])
    expect(entries.find(entry => entry.name === 'alpha')).toMatchObject({
      declaredAs: [
        'dependencies (^1.0.0)',
      ],
      homepage: 'https://stage-flow-tools.example/alpha',
      installedVersion: '1.2.3',
      license: 'MIT',
      licenseFiles: [
        'LICENSE',
      ],
      noticeFiles: [
        'NOTICE',
      ],
      repository: 'https://stage-flow-tools.example/alpha.git',
    })
    expect(entries.find(entry => entry.name === '@scope/beta')).toMatchObject({
      license: 'Apache-2.0',
    })
    expect(entries.find(entry => entry.name === 'gamma')).toMatchObject({
      declaredAs: [
        'peerDependencies (^3.0.0)',
      ],
      installedVersion: '3.0.1',
      license: 'BSD-3-Clause',
    })
    expect(entries.find(entry => entry.name === 'delta')).toMatchObject({
      declaredAs: [
        'optionalDependencies (^4.0.0)',
      ],
      license: 'MIT; ISC',
    })
    expect(entries.find(entry => entry.name === '@scope/tool')).toBeUndefined()
    expect(entries.find(entry => entry.name === 'pnpm')).toBeUndefined()
  })

  it('fails when a declared direct package is missing installed metadata', () => {
    const root = createTemporaryRoot()

    mkdirSync(resolve(root, 'node_modules'), { recursive: true })
    writeFileSync(resolve(root, 'package.json'), JSON.stringify({
      dependencies: {
        alpha: '^1.0.0',
      },
    }))

    expect(() => collectThirdPartyNoticeEntries({
      repoRoot: root,
    })).toThrow(/Missing installed package metadata for "alpha".*vp run install:clean/u)
  })

  it('keeps committed THIRD_PARTY_NOTICES.md fresh', () => {
    const expected = createThirdPartyNoticesForRepo({
      repoRoot,
    })
    const actual = readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8')

    expect(actual).toBe(expected)
  })
})
