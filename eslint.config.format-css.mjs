import css from '@eslint/css'
import js from '@eslint/js'
import pluginFormat from 'eslint-plugin-format'
import pluginJsonc from 'eslint-plugin-jsonc'
import pluginYml from 'eslint-plugin-yml'
import { tailwind4 } from 'tailwind-csstree'

function disableRules(rules, namespace = '') {
  return Object.fromEntries(
    Object.keys(rules).map(ruleName => [
      namespace ? `${namespace}/${ruleName}` : ruleName,
      'off',
    ]),
  )
}

/** @type {import('eslint').Linter.FlatConfig} */
export const formatCssConfig = { // Prettier formatting for CSS
  files: [
    '**/*.css',
  ],
  language: 'css/css',
  languageOptions: {
    customSyntax: tailwind4,
    tolerant: true,
  },
  plugins: {
    css,
    format: pluginFormat,
  },
  rules: {
    // Nuxt applies JavaScript, JSON, and YAML rules globally. CSS is none of them.
    ...disableRules(js.configs.recommended.rules),
    ...disableRules(pluginJsonc.rules, 'jsonc'),
    ...disableRules(pluginYml.rules, 'yml'),
    'format/prettier': [
      'error',
      { parser: 'css' },
    ],
  },
}
