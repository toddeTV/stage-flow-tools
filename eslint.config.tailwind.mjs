import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pluginTailwindCSS from 'eslint-plugin-tailwindcss'
import tailwindApplyOrderPlugin from './eslint.tailwind-apply-order.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tailwindCssEntryPath = resolve(__dirname, 'app/assets/css/main.css')
const tailwindConfig = {}

/** @type {import('eslint').Linter.FlatConfig[]} */
export const tailwindConfigs = [
  ...pluginTailwindCSS.configs['flat/recommended'],
  {
    settings: {
      tailwindcss: {
        config: tailwindConfig,
        cssFiles: [
          tailwindCssEntryPath,
        ],
      },
    },
  },
  {
    files: [
      '**/*.{js,mjs,ts,vue}',
    ],
    rules: {
      'tailwindcss/classnames-order': 'error',
      'tailwindcss/no-custom-classname': 'off',
    },
  },
  {
    files: [
      '**/*.css',
    ],
    plugins: {
      'tailwindcss-local': tailwindApplyOrderPlugin,
    },
    rules: {
      'tailwindcss-local/apply-classnames-order': [
        'error',
        {
          config: tailwindConfig,
        },
      ],
    },
  },
]
