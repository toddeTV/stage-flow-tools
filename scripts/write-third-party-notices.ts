import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import {
  dirname,
  resolve,
} from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const defaultRepoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

const dependencySections = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'optionalDependencies',
] as const

const noticeKindOrder = [
  'dependencies',
  'peerDependencies',
  'devDependencies',
  'optionalDependencies',
] as const

type NoticeKind = typeof noticeKindOrder[number]

export type PackageJsonDependencyMap = Record<string, string>

export type PackageJsonForNotices = {
  dependencies?: PackageJsonDependencyMap
  devDependencies?: PackageJsonDependencyMap
  optionalDependencies?: PackageJsonDependencyMap
  peerDependencies?: PackageJsonDependencyMap
}

export type ThirdPartyNoticeEntry = {
  declaredAs: string[]
  homepage?: string
  installedVersion: string
  license: string
  licenseFiles: string[]
  name: string
  noticeFiles: string[]
  repository?: string
}

export type WriteThirdPartyNoticesOptions = {
  nodeModulesRoot?: string
  noticesPath?: string
  packageJsonPath?: string
  repoRoot?: string
}

type RequestedPackage = {
  declarations: Map<NoticeKind, Set<string>>
  name: string
}

type InstalledPackageMetadata = {
  metadata: Record<string, unknown>
  packageRoot: string
}

const readJsonFile = (path: string): Record<string, unknown> => (
  JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
)

const isStringRecord = (value: unknown): value is Record<string, string> => (
  typeof value === 'object'
  && value !== null
  && Object.values(value).every(entry => typeof entry === 'string')
)

const addRequestedPackage = (
  requestedPackages: Map<string, RequestedPackage>,
  name: string,
  kind: NoticeKind,
  spec: string,
): void => {
  const requestedPackage = requestedPackages.get(name) ?? {
    declarations: new Map<NoticeKind, Set<string>>(),
    name,
  }
  const specs = requestedPackage.declarations.get(kind) ?? new Set<string>()

  specs.add(spec)
  requestedPackage.declarations.set(kind, specs)
  requestedPackages.set(name, requestedPackage)
}

export const collectRequestedPackages = (
  packageJson: PackageJsonForNotices,
): RequestedPackage[] => {
  const requestedPackages = new Map<string, RequestedPackage>()

  for (const section of dependencySections) {
    const dependencyMap = packageJson[section]

    if (!isStringRecord(dependencyMap)) {
      continue
    }

    for (const [
      name,
      spec,
    ] of Object.entries(dependencyMap)) {
      addRequestedPackage(requestedPackages, name, section, spec)
    }
  }

  return [
    ...requestedPackages.values(),
  ]
    .sort((left, right) => left.name.localeCompare(right.name))
}

const packageNameToNodeModulesPath = (nodeModulesRoot: string, name: string): string => (
  resolve(nodeModulesRoot, ...name.split('/'))
)

const readInstalledPackageMetadata = (
  nodeModulesRoot: string,
  name: string,
): InstalledPackageMetadata | undefined => {
  const packageRoot = packageNameToNodeModulesPath(nodeModulesRoot, name)
  const packageJsonPath = resolve(packageRoot, 'package.json')

  if (!existsSync(packageJsonPath)) {
    return undefined
  }

  return {
    metadata: readJsonFile(packageJsonPath),
    packageRoot,
  }
}

const missingInstalledPackageMetadataError = (
  nodeModulesRoot: string,
  name: string,
): Error => new Error([
  `Missing installed package metadata for "${name}" under ${packageNameToNodeModulesPath(nodeModulesRoot, name)}.`,
  'Run `vp run install:clean`, then rerun `vp run notices:generate`.',
].join(' '))

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

const normalizeLicense = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    const licenses = value
      .map(entry => normalizeLicense(entry))
      .filter((entry): entry is string => entry !== undefined)

    return licenses.length > 0 ? licenses.join('; ') : undefined
  }

  if (typeof value === 'object' && value !== null && 'type' in value) {
    return normalizeString((value as { type?: unknown }).type)
  }

  return normalizeString(value)
}

const normalizeRepository = (value: unknown): string | undefined => {
  if (typeof value === 'object' && value !== null && 'url' in value) {
    return normalizeString((value as { url?: unknown }).url)
  }

  return normalizeString(value)
}

const listPackageFiles = (packageRoot: string, pattern: RegExp): string[] => {
  try {
    return readdirSync(packageRoot, { withFileTypes: true })
      .filter(entry => entry.isFile() && pattern.test(entry.name))
      .map(entry => entry.name)
      .sort((left, right) => left.localeCompare(right))
  } catch {
    return []
  }
}

const formatDeclarations = (requestedPackage: RequestedPackage): string[] => (
  [
    ...requestedPackage.declarations.entries(),
  ]
    .sort((left, right) => (
      noticeKindOrder.indexOf(left[0]) - noticeKindOrder.indexOf(right[0])
    ))
    .map(([
      kind,
      specs,
    ]) => {
      const sortedSpecs = [
        ...specs,
      ].sort((left, right) => left.localeCompare(right))

      return `${kind} (${sortedSpecs.join(', ')})`
    })
)

const createNoticeEntry = (
  requestedPackage: RequestedPackage,
  nodeModulesRoot: string,
): ThirdPartyNoticeEntry => {
  const installedPackage = readInstalledPackageMetadata(nodeModulesRoot, requestedPackage.name)

  if (!installedPackage) {
    throw missingInstalledPackageMetadataError(nodeModulesRoot, requestedPackage.name)
  }

  const metadata = installedPackage.metadata
  const version = normalizeString(metadata.version)
  const license = normalizeLicense(metadata.license ?? metadata.licenses)

  return {
    declaredAs: formatDeclarations(requestedPackage),
    homepage: normalizeString(metadata.homepage),
    installedVersion: version ?? 'metadata unavailable',
    license: license ?? 'UNKNOWN',
    licenseFiles: listPackageFiles(installedPackage.packageRoot, /^(licen[cs]e|copying|copyright)(\..*)?$/iu),
    name: requestedPackage.name,
    noticeFiles: listPackageFiles(
      installedPackage.packageRoot,
      /^(notice|notices|third[-_. ]?party[-_. ]?notices?)(\..*)?$/iu,
    ),
    repository: normalizeRepository(metadata.repository),
  }
}

export const collectThirdPartyNoticeEntries = (
  options: WriteThirdPartyNoticesOptions = {},
): ThirdPartyNoticeEntry[] => {
  const repoRoot = options.repoRoot ?? defaultRepoRoot
  const packageJsonPath = options.packageJsonPath ?? resolve(repoRoot, 'package.json')
  const nodeModulesRoot = options.nodeModulesRoot ?? resolve(repoRoot, 'node_modules')
  const packageJson = readJsonFile(packageJsonPath) as PackageJsonForNotices

  return collectRequestedPackages(packageJson)
    .map(requestedPackage => createNoticeEntry(requestedPackage, nodeModulesRoot))
}

const formatOptionalLine = (label: string, value: string | undefined): string[] => (
  value ? [
    `- ${label}: ${value}`,
  ] : []
)

const formatFileList = (files: string[]): string => (
  files.length > 0 ? files.join(', ') : 'none found'
)

export const createThirdPartyNoticesMarkdown = (
  entries: ThirdPartyNoticeEntry[],
): string => {
  const lines = [
    '# Third-Party Notices',
    '',
    'This file is generated by `vp run notices:generate`.',
    'It covers installed direct `package.json` dependency declarations.',
    'This is an inventory, not a complete redistribution license bundle.',
    '',
    'Project source code remains governed by `LICENSE`. '
      + 'Third-party packages remain governed by their own license terms.',
    '',
    `Package count: ${entries.length}`,
    '',
    '## Packages',
    '',
  ]

  for (const entry of entries) {
    lines.push(
      `### ${entry.name}`,
      '',
      `- Declared as: ${entry.declaredAs.join('; ')}`,
      `- Installed version: ${entry.installedVersion}`,
      `- License: ${entry.license}`,
      ...formatOptionalLine('Repository', entry.repository),
      ...formatOptionalLine('Homepage', entry.homepage),
      `- Included license files: ${formatFileList(entry.licenseFiles)}`,
      `- Included notice files: ${formatFileList(entry.noticeFiles)}`,
    )

    lines.push('')
  }

  return `${lines.join('\n').trimEnd()}\n`
}

export const createThirdPartyNoticesForRepo = (
  options: WriteThirdPartyNoticesOptions = {},
): string => createThirdPartyNoticesMarkdown(collectThirdPartyNoticeEntries(options))

export const writeThirdPartyNotices = (
  options: WriteThirdPartyNoticesOptions = {},
): string => {
  const repoRoot = options.repoRoot ?? defaultRepoRoot
  const noticesPath = options.noticesPath ?? resolve(repoRoot, 'THIRD_PARTY_NOTICES.md')
  const markdown = createThirdPartyNoticesForRepo(options)

  mkdirSync(dirname(noticesPath), { recursive: true })
  writeFileSync(noticesPath, markdown)

  return markdown
}

export const checkThirdPartyNotices = (
  options: WriteThirdPartyNoticesOptions = {},
): void => {
  const repoRoot = options.repoRoot ?? defaultRepoRoot
  const noticesPath = options.noticesPath ?? resolve(repoRoot, 'THIRD_PARTY_NOTICES.md')
  const expected = createThirdPartyNoticesForRepo(options)
  const actual = existsSync(noticesPath) ? readFileSync(noticesPath, 'utf8') : ''

  if (actual !== expected) {
    throw new Error('THIRD_PARTY_NOTICES.md is stale. Run `vp run notices:generate`.')
  }
}

export const main = (argv = process.argv.slice(2)): void => {
  const [
    command,
  ] = argv

  if (command === undefined) {
    writeThirdPartyNotices()
    console.log('wrote THIRD_PARTY_NOTICES.md')
    return
  }

  if (command === '--check') {
    checkThirdPartyNotices()
    console.log('ok THIRD_PARTY_NOTICES.md is fresh')
    return
  }

  throw new Error('Usage: vp exec tsx scripts/write-third-party-notices.ts [--check]')
}

const isMainModule = (): boolean => (
  process.argv[1] !== undefined && resolve(process.argv[1]) === scriptPath
)

if (isMainModule()) {
  try {
    main()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error(message)
    process.exit(1)
  }
}
