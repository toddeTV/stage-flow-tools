import { globSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { icons as phosphor } from '@iconify-json/ph'
import ts from 'typescript'
import { parse } from 'vue/compiler-sfc'
import type { SFCTemplateBlock } from 'vue/compiler-sfc'

export interface IconUsage {
  name: string
  file: string
  line: number
}

type TemplateNode = NonNullable<SFCTemplateBlock['ast']>['children'][number]

/** Collect every possible name from the supported finite expression forms. */
function expressionNames(expression: ts.Expression): string[] {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return [
    expression.text,
  ]
  if (ts.isParenthesizedExpression(expression)) return expressionNames(expression.expression)
  if (ts.isConditionalExpression(expression)) {
    return [
      ...expressionNames(expression.whenTrue),
      ...expressionNames(expression.whenFalse),
    ]
  }
  throw new Error('Icon names must be string literals or conditionals with literal result branches')
}

function boundNames(source: string): string[] {
  const wrapped = `(${source})`
  const parsed = ts.createSourceFile('icon-name.ts', wrapped, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const statement = parsed.statements[0]
  if (parsed.statements.length !== 1 || !statement || !ts.isExpressionStatement(statement)) {
    throw new Error('Expected one icon name expression')
  }
  return expressionNames(statement.expression)
}

/** Parse real Vue templates; reject name bindings that cannot be checked. */
export function collectIconUsages(source: string, file: string): IconUsage[] {
  const { descriptor, errors } = parse(source, { filename: file })
  if (errors.length) {
    throw new Error(errors.map((error) => {
      const line = 'loc' in error ? error.loc?.start.line : undefined
      return `${file}${line ? `:${line}` : ''}: ${error.message}`
    }).join('; '))
  }
  const template = descriptor.template
  if (!template) return []
  if (template.src || template.lang && template.lang !== 'html' || !template.ast) {
    throw new Error(`${file}:${template.loc.start.line}: Expected an inline HTML template`)
  }
  const usages: IconUsage[] = []

  function visit(node: TemplateNode) {
    if (node.type !== 1) return
    if ([
      'Icon',
      'icon',
      'NuxtIcon',
      'nuxt-icon',
    ].includes(node.tag)) {
      const location = `${file}:${node.loc.start.line}`
      try {
        const names: string[] = []
        for (const prop of node.props) {
          if (prop.type === 6 && prop.name === 'name') names.push(prop.value?.content ?? '')
          if (prop.type !== 7 || prop.name !== 'bind') continue
          if (!prop.arg || prop.arg.type !== 4 || !prop.arg.isStatic) {
            throw new Error('Icon names cannot be supplied through object or dynamic-argument v-bind')
          }
          if (prop.arg.content === 'name') {
            if (prop.exp?.type !== 4) throw new Error('Expected an explicit icon name expression')
            names.push(...boundNames(prop.exp.content))
          }
        }
        if (!names.length || names.some(name => !name.trim())) throw new Error('Missing icon name')
        usages.push(...names.map(name => ({ name, file, line: node.loc.start.line })))
      }
      catch (error) {
        throw new Error(`${location}: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
      }
    }
    node.children.forEach(visit)
  }

  template.ast.children.forEach(visit)
  return usages
}

/** Discover new production SFCs automatically, excluding tests and fixtures. */
export function collectApplicationIconUsages(repoRoot: string): IconUsage[] {
  const appDirectory = resolve(repoRoot, 'app')
  const files = globSync('**/*.vue', {
    cwd: appDirectory,
    exclude: [
      '**/*.{test,spec}.vue',
      '**/{test,tests,fixtures,__fixtures__,__tests__,__mocks__}/**',
    ],
  }).sort()
  return files.flatMap((file) => {
    const path = resolve(appDirectory, file)
    return collectIconUsages(readFileSync(path, 'utf8'), relative(repoRoot, path))
  })
}

/** Check bundle coverage and validate registered names against local icon data. */
export function validateIconBundle(usages: IconUsage[], bundle: string[]): string[] {
  const registered = new Set(bundle)
  const errors = usages.filter(usage => !registered.has(usage.name))
    .map(usage => `${usage.file}:${usage.line}: ${usage.name} is missing from icon.clientBundle.icons`)
  for (const name of registered) {
    const key = name.slice(phosphor.prefix.length + 1)
    const exists = name.startsWith(`${phosphor.prefix}:`)
      && (Object.hasOwn(phosphor.icons, key) || Object.hasOwn(phosphor.aliases ?? {}, key))
    if (exists) continue
    const usage = usages.find(candidate => candidate.name === name)
    const location = usage ? `${usage.file}:${usage.line}` : 'nuxt.config.ts'
    errors.push(`${location}: ${name} does not exist in the local Phosphor collection`)
  }
  return errors.sort()
}
