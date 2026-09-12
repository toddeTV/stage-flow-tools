import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

import {
  findHeadingPlacementViolations,
  parseMarkdownStructureCheckMode,
  parseUnifiedDiff,
  runMarkdownHeadingPlacementCheck,
} from './check-markdown-heading-placement'

describe('Markdown heading placement check', () => {
  it('rejects a new heading that captures unchanged existing content', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Components',
      '',
      'Existing component guidance.',
      '',
      '## Utilities',
    ].join('\n')
    const headSource = [
      '# Guide',
      '',
      '## Components',
      '',
      '### Alternative layouts',
      '',
      'Existing component guidance.',
      '',
      '## Utilities',
    ].join('\n')
    const violations = findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -4,0 +5,2 @@\n+### Alternative layouts\n+\n'),
    )

    expect(violations).toEqual([
      {
        capturedLine: 7,
        capturedText: 'Existing component guidance.',
        headingLine: 5,
        headingText: 'Alternative layouts',
      },
    ])
  })

  it('rejects a Setext heading whose added underline captures existing content', () => {
    const baseSource = [
      '# Guide',
      '',
      'Existing title',
      '',
      'Existing content.',
    ].join('\n')
    const headSource = [
      '# Guide',
      '',
      'Existing title',
      '--------------',
      '',
      'Existing content.',
    ].join('\n')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -3,0 +4 @@\n+--------------\n'),
    )).toEqual([
      {
        capturedLine: 6,
        capturedText: 'Existing content.',
        headingLine: 3,
        headingText: 'Existing title',
      },
    ])
  })

  it('accepts a new heading at the end of its parent section', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Components',
      '',
      'Existing component guidance.',
      '',
      '## Utilities',
    ].join('\n')
    const headSource = [
      '# Guide',
      '',
      '## Components',
      '',
      'Existing component guidance.',
      '',
      '### Alternative layouts',
      '',
      'New layout guidance.',
      '',
      '## Utilities',
    ].join('\n')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -6,0 +7,4 @@\n+### Alternative layouts\n+\n+New layout guidance.\n+\n'),
    )).toEqual([])
  })

  it('accepts a renamed existing heading', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Old title',
      '',
      'Existing content.',
      '',
      '## Utilities',
    ].join('\n')
    const headSource = baseSource.replace('## Old title', '## New title')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -3 +3 @@\n-## Old title\n+## New title\n'),
    )).toEqual([])
  })

  it('accepts an in-place re-leveled existing heading', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Existing section',
      '',
      'Existing content.',
      '',
      '## Utilities',
    ].join('\n')
    const headSource = baseSource.replace('## Existing section', '### Existing section')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -3 +3 @@\n-## Existing section\n+### Existing section\n'),
    )).toEqual([])
  })

  it('accepts an in-place renamed and re-leveled existing heading', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Old title',
      '',
      'Existing content.',
      '',
      '## Utilities',
    ].join('\n')
    const headSource = baseSource.replace('## Old title', '### New title')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -3 +3 @@\n-## Old title\n+### New title\n'),
    )).toEqual([])
  })

  it('accepts adjacent renamed parent and child headings', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Old parent',
      '### Old child',
      '',
      'Existing content.',
      '',
      '## Utilities',
    ].join('\n')
    const headSource = baseSource
      .replace('## Old parent', '## New parent')
      .replace('### Old child', '### New child')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -3,2 +3,2 @@\n-## Old parent\n-### Old child\n+## New parent\n+### New child\n'),
    )).toEqual([])
  })

  it('ignores heading-like code-fence content and fully new documents', () => {
    const baseSource = [
      '# Guide',
      '',
      '## Components',
      '',
      'Existing content.',
    ].join('\n')
    const headSource = [
      '# Guide',
      '',
      '## Components',
      '',
      'Existing content.',
      '',
      '```md',
      '### Not a heading',
      '```',
    ].join('\n')
    const newDocument = [
      '# New guide',
      '',
      '## New section',
      '',
      'New content.',
    ].join('\n')

    expect(findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff('@@ -5,0 +6,4 @@\n+\n+```md\n+### Not a heading\n+```\n'),
    )).toEqual([])
    expect(findHeadingPlacementViolations(
      '',
      newDocument,
      parseUnifiedDiff('@@ -0,0 +1,5 @@\n+# New guide\n+\n+## New section\n+\n+New content.\n'),
    )).toEqual([])
  })

  it('supports explicit revision and staged modes', () => {
    expect(parseMarkdownStructureCheckMode([
      '--base',
      'base-sha',
      '--head',
      'head-sha',
    ])).toEqual({
      base: 'base-sha',
      head: 'head-sha',
      kind: 'revisions',
    })
    expect(parseMarkdownStructureCheckMode([
      '--staged',
    ])).toEqual({ kind: 'staged' })
    expect(parseMarkdownStructureCheckMode([
      '--',
      '--staged',
    ])).toEqual({ kind: 'staged' })
  })

  it('uses the merge base when the revision base branch has advanced', () => {
    const root = mkdtempSync(join(tmpdir(), 'markdown-heading-placement-'))
    const originalCwd = process.cwd()
    const runGit = (args: string[]) => {
      execFileSync('git', args, {
        cwd: root,
        stdio: 'ignore',
      })
    }

    try {
      runGit([
        'init',
      ])
      runGit([
        'config',
        'user.email',
        'test@localhost',
      ])
      runGit([
        'config',
        'user.name',
        'Test User',
      ])
      writeFileSync(join(root, 'guide.md'), [
        '# Guide',
        '',
        '## Old title',
        '',
        'Existing content.',
      ].join('\n'))
      runGit([
        'add',
        'guide.md',
      ])
      runGit([
        'commit',
        '-m',
        'initial',
      ])
      runGit([
        'branch',
        'feature',
      ])

      writeFileSync(join(root, 'guide.md'), [
        '# Guide',
        '',
        '<!-- Base-only note. -->',
        '<!-- Another base-only note. -->',
        '',
        '## Old title',
        '',
        'Existing content.',
      ].join('\n'))
      runGit([
        'commit',
        '-am',
        'advance base',
      ])
      const base = execFileSync('git', [
        'rev-parse',
        'HEAD',
      ], {
        cwd: root,
        encoding: 'utf8',
      }).trim()

      runGit([
        'checkout',
        'feature',
      ])
      writeFileSync(join(root, 'guide.md'), [
        '# Guide',
        '',
        '## New title',
        '',
        'Existing content.',
      ].join('\n'))
      runGit([
        'commit',
        '-am',
        'rename heading',
      ])
      const head = execFileSync('git', [
        'rev-parse',
        'HEAD',
      ], {
        cwd: root,
        encoding: 'utf8',
      }).trim()

      process.chdir(root)

      expect(() => runMarkdownHeadingPlacementCheck([
        '--base',
        base,
        '--head',
        head,
      ])).not.toThrow()
    }
    finally {
      process.chdir(originalCwd)
      rmSync(root, {
        force: true,
        recursive: true,
      })
    }
  })
})
