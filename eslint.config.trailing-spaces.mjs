import pluginStylistic from '@stylistic/eslint-plugin'

/** @type {import('eslint').Linter.FlatConfig} */
export const trailingSpacesConfig = { // Trailing spaces for JSON/JSONC/YAML
  files: [
    '**/*.json',
    '**/*.jsonc',
    '**/*.yaml',
    '**/*.yml',
  ],
  plugins: {
    '@stylistic': pluginStylistic,
  },
  rules: {
    '@stylistic/no-trailing-spaces': 'error',
  },
}
