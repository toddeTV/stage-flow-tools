import DOMPurify from 'dompurify'
import {
  Marked,
  Renderer,
} from 'marked'

const renderer = new Renderer()

// Legal documents are Markdown only. Raw HTML is never interpreted as markup.
renderer.html = () => ''

const markdown = new Marked({
  async: false,
  gfm: true,
  renderer,
})

const allowedTags = [
  'a',
  'blockquote',
  'br',
  'code',
  'del',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'hr',
  'li',
  'ol',
  'p',
  'pre',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'ul',
]

/** Renders Markdown for the public legal pages into safe browser HTML. */
export function renderLegalMarkdown(content: string): string {
  // `async: false` makes Marked return a string; its type also supports async use.
  const renderedMarkdown = markdown.parse(content) as string

  return DOMPurify.sanitize(renderedMarkdown, {
    ALLOWED_ATTR: [
      'href',
      'title',
    ],
    ALLOWED_TAGS: allowedTags,
    ALLOWED_URI_REGEXP: /^(?:(?:https|mailto|tel):|#)/i,
    ALLOW_DATA_ATTR: false,
  })
}
