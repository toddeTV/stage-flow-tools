// @vitest-environment jsdom

import {
  describe,
  expect,
  it,
} from 'vite-plus/test'
import {
  quizMarkdownToPlainText,
  renderQuizMarkdown,
} from './render-quiz-markdown.client'

describe('quiz Markdown renderer', () => {
  it('renders emphasis, inline code, and focusable block code', () => {
    const rendered = renderQuizMarkdown([
      '**Bold**, *italic*, and `inline`.',
      '',
      '```ts',
      'const value = 1',
      'console.log(value)',
      '```',
    ].join('\n'), 'block')

    expect(rendered).toContain('<strong>Bold</strong>')
    expect(rendered).toContain('<em>italic</em>')
    expect(rendered).toContain('<code>inline</code>')
    expect(rendered).toContain('class="quiz-markdown-code-block" tabindex="0"')
    expect(rendered).toContain('const value = 1\nconsole.log(value)')
    expect(rendered).not.toContain('language-ts')
  })

  it('collapses fenced code into inline code for presenter mode', () => {
    const rendered = renderQuizMarkdown([
      'Before',
      '',
      '```ts',
      'const value = 1',
      'console.log(value)',
      '```',
    ].join('\n'), 'inline')

    expect(rendered).toContain('Before <code>const value = 1 console.log(value)</code>')
    expect(rendered).not.toContain('quiz-markdown-code-block')
    expect(rendered).not.toContain('<pre')
  })

  it('leaves unsupported Markdown and raw HTML inert', () => {
    const rendered = renderQuizMarkdown([
      '# Heading',
      '<script>alert("unsafe")</script>',
      '<img src=x onerror="alert(1)">',
      '[unsafe](javascript:alert(1))',
      '~~deleted~~',
    ].join('\n\n'), 'block')
    const container = document.createElement('div')
    container.innerHTML = rendered

    expect(container.querySelector('a, del, h1, img, script')).toBeNull()
    expect(container.textContent).toContain('# Heading')
    expect(container.textContent).toContain('<script>alert("unsafe")</script>')
    expect(container.textContent).toContain('[unsafe](javascript:alert(1))')
    expect(container.textContent).toContain('~~deleted~~')
  })

  it('creates compact plain text for accessible labels', () => {
    expect(quizMarkdownToPlainText('**Answer** with `code`')).toBe('Answer with code')
  })
})
