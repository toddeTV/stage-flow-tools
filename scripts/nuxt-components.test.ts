import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))

function readFile(path: string) {
  return readFileSync(resolve(repoRoot, path), 'utf8')
}

describe('Nuxt component auto-imports', () => {
  it('uses filename-only names for nested components', () => {
    expect(readFile('nuxt.config.ts')).toContain("path: '~/components', pathPrefix: false")

    const componentTypes = readFile('.nuxt/types/components.d.ts')
    expect(componentTypes).toContain('QuestionPackageImportWizard: typeof import')
    expect(componentTypes).not.toContain('QuestionsQuestionPackageImportWizard')
  })
})
