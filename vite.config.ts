import { defineConfig } from 'vite-plus'

export default defineConfig({
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
