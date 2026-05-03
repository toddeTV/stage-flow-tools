/** @type {import('eslint').Linter.FlatConfig} */
export const vueConfig = {
  files: [
    '**/*.vue',
  ],
  rules: {
    'vue/html-indent': [
      'error',
      2,
    ],
    'vue/script-indent': [
      'error',
      2,
      { baseIndent: 0 },
    ],
    'vue/html-quotes': [
      'error',
      'double',
    ],
    'vue/attributes-order': [
      'error',
      {
        alphabetical: true,
      },
    ],
    'vue/max-attributes-per-line': [
      'error',
      {
        multiline: 1,
        singleline: 3,
      },
    ],
  },
}
