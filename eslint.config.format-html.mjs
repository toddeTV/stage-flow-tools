import pluginFormat from 'eslint-plugin-format'

/** @type {import('eslint').Linter.FlatConfig} */
export const formatHtmlConfig = { // Prettier formatting for HTML
  files: [
    '**/*.html',
  ],
  languageOptions: {
    parser: pluginFormat.parserPlain,
  },
  plugins: {
    format: pluginFormat,
  },
  rules: {
    'format/prettier': [
      'error',
      { parser: 'html' },
    ],
  },
}
