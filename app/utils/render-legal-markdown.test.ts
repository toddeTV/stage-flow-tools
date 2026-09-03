// @vitest-environment jsdom

import {
  describe,
  expect,
  it,
} from 'vite-plus/test'
import { renderLegalMarkdown } from './render-legal-markdown.client'

describe('legal Markdown renderer', () => {
  it('renders headings, emphasis, and permitted links', () => {
    const content = [
      '## Contact',
      '',
      '**Email:** [hello@todde.tv](mailto:hello@todde.tv)',
      '',
      '[Website](https://todde.tv/)',
    ].join('\n')
    const rendered = renderLegalMarkdown(content)

    expect(rendered).toContain('<h2>Contact</h2>')
    expect(rendered).toContain('<strong>Email:</strong>')
    expect(rendered).toContain('href="mailto:hello@todde.tv"')
    expect(rendered).toContain('href="https://todde.tv/"')
  })

  it('removes raw HTML, script elements, event handlers, and unsafe links', () => {
    const rendered = renderLegalMarkdown(`
<script>alert('not executed')</script>
<a href="https://example.com" onclick="alert('not executed')">Raw HTML</a>
[Unsafe link](javascript:alert('not executed'))
`)

    expect(rendered).not.toContain('<script')
    expect(rendered).not.toContain('onclick')
    expect(rendered).not.toContain('href="javascript:')
    expect(rendered).not.toContain('<a href="https://example.com"')
  })
})
