import pluginStylistic from '@stylistic/eslint-plugin'
import pluginFormat from 'eslint-plugin-format'

const markdownPlainProcessor = {
  meta: {
    name: 'format-markdown/plain-processor',
    version: '1.0.0',
  },
  preprocess(text) {
    return [
      text,
    ]
  },
  postprocess(messageLists) {
    return messageLists[0] ?? []
  },
  supportsAutofix: true,
}

/** @type {import('eslint').Linter.FlatConfig} */
export const formatMarkdownConfig = { // Stylistic formatting for Markdown
  files: [
    '**/*.md',
  ],
  processor: markdownPlainProcessor,
  languageOptions: {
    parser: pluginFormat.parserPlain,
  },
  plugins: {
    '@stylistic': pluginStylistic,
  },
  rules: {
    '@stylistic/no-multiple-empty-lines': [
      'error',
      {
        max: 1,
        maxBOF: 0,
        maxEOF: 0,
      },
    ],
    '@stylistic/no-trailing-spaces': 'error',
  },
}
