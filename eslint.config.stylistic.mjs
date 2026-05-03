import pluginStylistic from '@stylistic/eslint-plugin'

/** @type {import('eslint').Linter.FlatConfig} */
export const stylisticConfig = { // Stylistic overrides
  files: [
    '**/*.js',
    '**/*.mjs',
    '**/*.ts',
    '**/*.vue',
  ],
  plugins: {
    '@stylistic': pluginStylistic,
  },
  rules: {
    '@stylistic/array-bracket-newline': [
      'error',
      { multiline: true, minItems: 1 },
    ],
    '@stylistic/array-element-newline': [
      'error',
      'always',
    ],
    '@stylistic/comma-dangle': [
      'error',
      'always-multiline',
    ],
    '@stylistic/indent': [
      'error',
      2,
    ],
    '@stylistic/no-trailing-spaces': 'error',
    '@stylistic/quotes': [
      'error',
      'single',
      { avoidEscape: true },
    ],
    '@stylistic/max-len': [
      'error',
      {
        code: 120,
        // Ignore SVG path d attributes and inline data-URI background images
        ignorePattern: String.raw`^\s*d="|url\(["']data:image`,
      },
    ],
  },
}
