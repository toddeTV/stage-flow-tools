import pluginFormat from 'eslint-plugin-format'

/** @type {import('eslint').Linter.FlatConfig} */
export const formatCssConfig = { // Prettier formatting for CSS
  files: [
    '**/*.css',
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
      { parser: 'css' },
    ],
  },
}
