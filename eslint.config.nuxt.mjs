import pluginPerfectionist from 'eslint-plugin-perfectionist'

/** @type {import('eslint').Linter.FlatConfig} */
export const nuxtConfigSortingConfig = {
  files: [
    'nuxt.config.ts',
  ],
  plugins: {
    perfectionist: pluginPerfectionist,
  },
  rules: {
    'nuxt/nuxt-config-keys-order': 'off',
    'perfectionist/sort-objects': [
      'error',
      {
        order: 'asc',
        partitionByComment: true,
        type: 'alphabetical',
      },
    ],
  },
}
