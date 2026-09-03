import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite-plus'

const rootDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '#shared': resolve(rootDirectory, 'shared'),
      '~': resolve(rootDirectory, 'app'),
    },
  },

  staged: {
    '**/*.{css,html,js,mjs,cjs,ts,mts,cts,vue,json,jsonc,yaml,yml,md}': [
      'vp exec eslint',
    ],
    '.coderabbit.yml': [
      'vp exec eslint',
    ],
    'package.json': [
      'vp run test:package-json',
    ],
  },
  run: {
    cache: true,
  },
})
