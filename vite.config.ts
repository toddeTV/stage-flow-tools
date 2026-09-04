import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite-plus'

const rootDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    VueI18nPlugin({}),
    vue(),
  ],
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
