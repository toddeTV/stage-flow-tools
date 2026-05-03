import * as pluginYml from 'eslint-plugin-yml'

/** @type {import('eslint').Linter.FlatConfig[]} */
export const yamlConfigs = [
  ...pluginYml.configs['flat/standard'],
  {
    files: [
      '**/*.yaml',
      '**/*.yml',
    ],
    rules: {
      'yml/sort-keys': 'error',
    },
  },
  {
    files: [
      '.coderabbit.yml',
      '.github/workflows/*.yml',
    ],
    rules: {
      'yml/sort-keys': 'off',
    },
  },
]
