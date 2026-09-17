import DOMPurify from 'dompurify'
import {
  Marked,
  Renderer,
} from 'marked'

export type QuizMarkdownMode = 'block' | 'inline'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function createQuizMarkdown(mode: QuizMarkdownMode): Marked {
  const renderer = new Renderer()
  const unsupportedBlock = ({ raw }: { raw: string }) => mode === 'block'
    ? `<span class="quiz-markdown-paragraph">${escapeHtml(raw.trimEnd())}</span>`
    : `${escapeHtml(raw.trimEnd())} `
  const unsupportedInline = ({ raw }: { raw: string }) => escapeHtml(raw)

  renderer.blockquote = unsupportedBlock
  renderer.code = ({ text }) => mode === 'block'
    ? `<span class="quiz-markdown-code-block" tabindex="0"><code>${escapeHtml(text)}</code></span>`
    : `<code>${escapeHtml(text.replace(/\s*\r?\n\s*/g, ' ').trim())}</code>`
  renderer.def = unsupportedBlock
  renderer.del = unsupportedInline
  renderer.heading = unsupportedBlock
  renderer.hr = unsupportedBlock
  renderer.html = unsupportedInline
  renderer.image = unsupportedInline
  renderer.link = unsupportedInline
  renderer.list = unsupportedBlock
  renderer.paragraph = function ({ tokens }) {
    const content = this.parser.parseInline(tokens)
    return mode === 'block'
      ? `<span class="quiz-markdown-paragraph">${content}</span>`
      : `${content} `
  }
  renderer.table = unsupportedBlock

  return new Marked({
    async: false,
    gfm: true,
    renderer,
  })
}

const markdownByMode = {
  block: createQuizMarkdown('block'),
  inline: createQuizMarkdown('inline'),
}

/** Renders the supported quiz Markdown subset into sanitized browser HTML. */
export function renderQuizMarkdown(content: string, mode: QuizMarkdownMode): string {
  const renderedMarkdown = markdownByMode[mode].parse(content) as string

  return DOMPurify.sanitize(renderedMarkdown, {
    ALLOWED_ATTR: [
      'class',
      'tabindex',
    ],
    ALLOWED_TAGS: [
      'br',
      'code',
      'em',
      'span',
      'strong',
    ],
    ALLOW_DATA_ATTR: false,
  }).trim()
}

/** Converts quiz Markdown into compact text for accessible labels. */
export function quizMarkdownToPlainText(content: string): string {
  const container = document.createElement('span')
  container.innerHTML = renderQuizMarkdown(content, 'inline')
  return (container.textContent ?? '').replace(/\s+/g, ' ').trim()
}
