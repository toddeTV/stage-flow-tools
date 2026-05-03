/** @type {import('eslint').Linter.FlatConfig} */
export const maxLenDisabledConfig = { // Disable max-len in Markdown and YAML
  files: [
    '**/*.md',
    '**/*.yaml',
    '**/*.yml',
  ],
  rules: {
    '@stylistic/max-len': 'off',
  },
}
