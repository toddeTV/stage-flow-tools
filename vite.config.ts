import { defineConfig } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': [
      'vp run test:lint-format',
    ],
  },
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
})
