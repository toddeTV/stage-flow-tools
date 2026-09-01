import pluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'

/** @type {import('eslint').Linter.FlatConfig[]} */
export const tailwindConfigs = [
  {
    files: [
      '**/*.{css,js,mjs,ts,vue}',
    ],
    plugins: {
      'better-tailwindcss': pluginBetterTailwindcss,
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
      },
    },
    rules: {
      'better-tailwindcss/enforce-consistent-class-order': [
        'error',
        {
          order: 'official',
        },
      ],
      'better-tailwindcss/enforce-consistent-important-position': 'error',
      'better-tailwindcss/no-deprecated-classes': 'error',
    },
  },
]
