import { defineConfig } from 'vite-plus';

export default defineConfig({
  staged: {
    '*': [
      'vp run test:lint',
    ],
  },
  fmt: {},
  lint: {"options":{"typeAware":true,"typeCheck":true}},
});
