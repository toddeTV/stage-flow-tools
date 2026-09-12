import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt()
const ignoredPathPrefix = 'graphify-out/'
const markdownPathPattern = /\.(?:md|markdown)$/iu

type ChangedPath = {
  basePath: string
  headPath: string
}

type Heading = {
  endLine: number
  level: number
  line: number
  text: string
}

type UnchangedDiffLine = {
  baseLine: number
  headLine: number
  text: string
}

export type DiffHunk = {
  addedLines: Set<number>
  removedLines: Set<number>
  unchangedLines: UnchangedDiffLine[]
}

export type HeadingPlacementViolation = {
  capturedLine: number
  capturedText: string
  headingLine: number
  headingText: string
}

export type MarkdownStructureCheckMode =
  | {
    kind: 'revisions'
    base: string
    head: string
  }
  | {
    kind: 'staged'
  }
  | {
    kind: 'worktree'
  }

function runGit(args: string[]) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: [
      'ignore',
      'pipe',
      'ignore',
    ],
  })
}

function readGitFile(revision: string, path: string) {
  try {
    return runGit([
      'show',
      `${revision}:${path}`,
    ])
  }
  catch {
    return null
  }
}

function getMarkdownHeadings(source: string): Heading[] {
  const tokens = markdown.parse(source, {})
  const headings: Heading[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]

    if (token?.type !== 'heading_open' || token.map === null) {
      continue
    }

    const level = Number(token.tag.slice(1))
    const inlineToken = tokens[index + 1]

    if (!Number.isInteger(level) || inlineToken?.type !== 'inline') {
      continue
    }

    headings.push({
      endLine: token.map[1],
      level,
      line: token.map[0] + 1,
      text: inlineToken.content.trim(),
    })
  }

  return headings
}

function headingTouchesLines(heading: Heading, lines: Set<number>) {
  for (let line = heading.line; line <= heading.endLine; line += 1) {
    if (lines.has(line)) {
      return true
    }
  }

  return false
}

function isEligibleMarkdownPath(path: string) {
  return !path.startsWith(ignoredPathPrefix) && markdownPathPattern.test(path)
}

function isHeadingRename(
  heading: Heading,
  headHeadings: Heading[],
  baseHeadings: Heading[],
  diffHunks: DiffHunk[],
) {
  const hunk = diffHunks.find(candidate => headingTouchesLines(heading, candidate.addedLines))

  if (!hunk) {
    return false
  }

  const countUnchangedLinesBeforeHeading = (candidate: Heading, line: 'baseLine' | 'headLine') => (
    hunk.unchangedLines.filter(unchangedLine => (
      unchangedLine.text.trim() && unchangedLine[line] < candidate.line
    )).length
  )
  const headingBoundary = countUnchangedLinesBeforeHeading(heading, 'headLine')
  const addedHeadings = headHeadings.filter(candidate => (
    headingTouchesLines(candidate, hunk.addedLines)
    && countUnchangedLinesBeforeHeading(candidate, 'headLine') === headingBoundary
  ))
  const removedHeadings = baseHeadings.filter(candidate => (
    headingTouchesLines(candidate, hunk.removedLines)
    && countUnchangedLinesBeforeHeading(candidate, 'baseLine') === headingBoundary
  ))

  return addedHeadings.length === removedHeadings.length
}

export function parseUnifiedDiff(diff: string): DiffHunk[] {
  const hunkHeaderPattern = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/u
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let currentOldLine = 0
  let currentNewLine = 0

  for (const line of diff.split('\n')) {
    const header = line.match(hunkHeaderPattern)

    if (header) {
      currentOldLine = Number(header[1])
      currentNewLine = Number(header[3])
      currentHunk = {
        addedLines: new Set(),
        removedLines: new Set(),
        unchangedLines: [],
      }
      hunks.push(currentHunk)
      continue
    }

    if (!currentHunk || line.startsWith('\\ No newline at end of file')) {
      continue
    }

    if (line.startsWith('+')) {
      currentHunk.addedLines.add(currentNewLine)
      currentNewLine += 1
      continue
    }

    if (line.startsWith('-')) {
      currentHunk.removedLines.add(currentOldLine)
      currentOldLine += 1
      continue
    }

    if (line.startsWith(' ')) {
      currentHunk.unchangedLines.push({
        baseLine: currentOldLine,
        headLine: currentNewLine,
        text: line.slice(1),
      })
      currentOldLine += 1
      currentNewLine += 1
    }
  }

  return hunks
}

export function findHeadingPlacementViolations(
  baseSource: string,
  headSource: string,
  diffHunks: DiffHunk[],
): HeadingPlacementViolation[] {
  const baseHeadings = getMarkdownHeadings(baseSource)
  const headHeadings = getMarkdownHeadings(headSource)
  const addedLines = new Set(diffHunks.flatMap(hunk => [
    ...hunk.addedLines,
  ]))
  const lines = headSource.split(/\r?\n/u)
  const violations: HeadingPlacementViolation[] = []

  for (let index = 0; index < headHeadings.length; index += 1) {
    const heading = headHeadings[index]

    if (!heading || heading.level < 2 || heading.level > 6 || !headingTouchesLines(heading, addedLines)) {
      continue
    }

    if (isHeadingRename(heading, headHeadings, baseHeadings, diffHunks)) {
      continue
    }

    const nextSectionHeading = headHeadings.slice(index + 1).find(candidate => (
      candidate.level <= heading.level
    ))
    const sectionEndLine = nextSectionHeading?.line ?? lines.length + 1

    for (let line = heading.endLine + 1; line < sectionEndLine; line += 1) {
      const content = lines[line - 1]?.trim()

      if (!content || addedLines.has(line)) {
        continue
      }

      violations.push({
        capturedLine: line,
        capturedText: content,
        headingLine: heading.line,
        headingText: heading.text,
      })
      break
    }
  }

  return violations
}

function parseChangedPaths(output: string): ChangedPath[] {
  return output
    .split('\n')
    .filter(Boolean)
    .flatMap(line => {
      const [
        status,
        ...paths
      ] = line.split('\t')

      if (!status || paths.length === 0) {
        return []
      }

      if (status.startsWith('R') || status.startsWith('C')) {
        const [
          basePath,
          headPath,
        ] = paths

        return basePath && headPath
          ? [
            {
              basePath,
              headPath,
            },
          ]
          : []
      }

      const [
        path,
      ] = paths
      return path
        ? [
          {
            basePath: path,
            headPath: path,
          },
        ]
        : []
    })
    .filter(change => isEligibleMarkdownPath(change.headPath))
}

function getChangedPaths(mode: MarkdownStructureCheckMode): ChangedPath[] {
  if (mode.kind === 'revisions') {
    return parseChangedPaths(runGit([
      'diff',
      '--name-status',
      '--find-renames',
      '--diff-filter=ACMR',
      `${mode.base}...${mode.head}`,
      '--',
    ]))
  }

  const diffArgs = mode.kind === 'staged'
    ? [
      'diff',
      '--cached',
      '--name-status',
      '--find-renames',
      '--diff-filter=ACMR',
      '--',
    ]
    : [
      'diff',
      '--name-status',
      '--find-renames',
      '--diff-filter=ACMR',
      'HEAD',
      '--',
    ]
  const changedPaths = parseChangedPaths(runGit(diffArgs))

  if (mode.kind === 'staged') {
    return changedPaths
  }

  const untrackedPaths = runGit([
    'ls-files',
    '--others',
    '--exclude-standard',
  ])
    .split('\n')
    .filter(path => isEligibleMarkdownPath(path))
    .map(path => ({
      basePath: path,
      headPath: path,
    }))

  return [
    ...new Map([
      ...changedPaths,
      ...untrackedPaths,
    ].map(change => [
      change.headPath,
      change,
    ])).values(),
  ]
}

function readSources(mode: MarkdownStructureCheckMode, change: ChangedPath) {
  if (mode.kind === 'revisions') {
    return {
      baseSource: readGitFile(mode.base, change.basePath),
      headSource: readGitFile(mode.head, change.headPath),
    }
  }

  if (mode.kind === 'staged') {
    return {
      baseSource: readGitFile('HEAD', change.basePath),
      headSource: readGitFile('', change.headPath),
    }
  }

  try {
    return {
      baseSource: readGitFile('HEAD', change.basePath),
      headSource: readFileSync(change.headPath, 'utf8'),
    }
  }
  catch {
    return {
      baseSource: null,
      headSource: null,
    }
  }
}

function getDiff(mode: MarkdownStructureCheckMode, change: ChangedPath) {
  if (mode.kind === 'revisions') {
    return runGit([
      'diff',
      '--no-color',
      '--unified=0',
      '--find-renames',
      `${mode.base}...${mode.head}`,
      '--',
      change.headPath,
    ])
  }

  if (mode.kind === 'staged') {
    return runGit([
      'diff',
      '--cached',
      '--no-color',
      '--unified=0',
      '--find-renames',
      '--',
      change.headPath,
    ])
  }

  return runGit([
    'diff',
    '--no-color',
    '--unified=0',
    '--find-renames',
    'HEAD',
    '--',
    change.headPath,
  ])
}

function resolveRevisionBase(mode: MarkdownStructureCheckMode) {
  if (mode.kind !== 'revisions') {
    return mode
  }

  return {
    ...mode,
    base: runGit([
      'merge-base',
      mode.base,
      mode.head,
    ]).trim(),
  }
}

export function parseMarkdownStructureCheckMode(
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
): MarkdownStructureCheckMode {
  let base: string | undefined
  let head: string | undefined
  let staged = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--') {
      continue
    }

    if (argument === '--staged') {
      staged = true
      continue
    }

    if (argument === '--base' || argument === '--head') {
      const value = args[index + 1]

      if (!value) {
        throw new Error(`${argument} requires a Git revision.`)
      }

      if (argument === '--base') {
        base = value
      }
      else {
        head = value
      }
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  if (staged && (base || head)) {
    throw new Error('Use either --staged or --base with --head.')
  }

  if (staged) {
    return { kind: 'staged' }
  }

  if (base || head) {
    if (!base || !head) {
      throw new Error('Use --base and --head together.')
    }

    return {
      base,
      head,
      kind: 'revisions',
    }
  }

  const ciBase = environment.CHECK_MARKDOWN_STRUCTURE_BASE_SHA
  const ciHead = environment.CHECK_MARKDOWN_STRUCTURE_HEAD_SHA

  if (ciBase || ciHead) {
    if (!ciBase || !ciHead) {
      throw new Error('CHECK_MARKDOWN_STRUCTURE_BASE_SHA and CHECK_MARKDOWN_STRUCTURE_HEAD_SHA must be set together.')
    }

    return {
      base: ciBase,
      head: ciHead,
      kind: 'revisions',
    }
  }

  return { kind: 'worktree' }
}

export function runMarkdownHeadingPlacementCheck(
  args = process.argv.slice(2),
  environment: NodeJS.ProcessEnv = process.env,
) {
  const mode = resolveRevisionBase(parseMarkdownStructureCheckMode(args, environment))
  const violations = getChangedPaths(mode).flatMap(change => {
    const {
      baseSource,
      headSource,
    } = readSources(mode, change)

    if (baseSource === null || headSource === null) {
      return []
    }

    return findHeadingPlacementViolations(
      baseSource,
      headSource,
      parseUnifiedDiff(getDiff(mode, change)),
    ).map(violation => ({
      ...violation,
      path: change.headPath,
    }))
  })

  if (violations.length > 0) {
    throw new Error([
      'A new Markdown heading would capture unchanged existing content:',
      ...violations.map(violation => (
        `${violation.path}:${violation.headingLine}: "${violation.headingText}" captures `
        + `existing content at line ${violation.capturedLine}: ${violation.capturedText}`
      )),
      'Move the heading to the end of its parent section or move the captured content in the same change.',
    ].join('\n'))
  }

  console.log('Markdown heading placement check passed.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runMarkdownHeadingPlacementCheck()
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(`Unable to validate Markdown heading placement.\n${message}`)
    process.exit(1)
  }
}
