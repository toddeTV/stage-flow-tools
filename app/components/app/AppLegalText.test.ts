import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

const componentSource = readFileSync(fileURLToPath(new URL('./AppLegalText.vue', import.meta.url)), 'utf8')

describe('app legal text', () => {
  it('loads the selected public database document', () => {
    expect(componentSource).toContain('`/api/legal/${props.document.key}`')
    expect(componentSource).toContain('useFetch<PublicLegalDocument | null>')
  })

  it('keeps the English-only notice and uses only sanitized Markdown output', () => {
    expect(componentSource).toContain('This legal document is provided in English only.')
    expect(componentSource).toContain('renderLegalMarkdown(legalDocument.value.content)')
    expect(componentSource).toContain('v-html="renderedContent"')
    expect(componentSource).toContain('renderLegalMarkdown sanitizes this Markdown-only output')
  })

  it('reports an unconfigured document without replacing the public route', () => {
    expect(componentSource).toContain('This legal document has not been configured for this installation.')
    expect(componentSource).toContain('role="alert"')
  })

  it('leaves the page landmark and viewport height to the default layout', () => {
    expect(componentSource).toContain('<div class="mx-auto max-w-3xl p-5">')
    expect(componentSource).not.toContain('<main')
    expect(componentSource).not.toContain('min-h-screen')
  })
})
