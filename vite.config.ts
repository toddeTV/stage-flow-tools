import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': [
      'vp run test:lint-format',
    ],
    'package.json': [
      'vp run test:package-json',
    ],
    '*.{ts,vue}': [
      // Wrapped in `sh -c` so Vite+ staged doesn't append file paths;
      // `nuxt typecheck` is project-wide and fails when given individual files.
      'sh -c "vp run test:type"',
    ],
  },
  run: {
    cache: true,
  },
})
