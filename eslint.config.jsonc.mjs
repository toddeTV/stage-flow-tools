import * as pluginJsonc from 'eslint-plugin-jsonc'

/** @type {import('eslint').Linter.FlatConfig[]} */
export const jsonAndJsoncConfigs = [
  ...pluginJsonc.configs['flat/recommended-with-jsonc'],
  {
    files: [
      '**/*.json',
      '**/*.jsonc',
    ],
    rules: {
      'jsonc/array-bracket-newline': [
        'error',
        { multiline: true, minItems: 1 },
      ],
      'jsonc/array-element-newline': [
        'error',
        'always',
      ],
      'jsonc/indent': [
        'error',
        2,
      ],
      'jsonc/comma-dangle': [
        'error',
        'never',
      ],
      'jsonc/sort-keys': 'error',
    },
  },
  {
    // Enforce trailing commas for configuration files
    files: [
      '**/*.jsonc',
      'tsconfig.json',
    ],
    rules: {
      'jsonc/comma-dangle': [
        'error',
        'always',
      ],
    },
  },
  {
    // Disable JSONC sort-keys for files where key order is meaningful
    files: [
      'package.json',
      'tsconfig.json',
    ],
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },
]
