/** @type {import('eslint').Linter.FlatConfig} */
export const globalIgnoresConfig = {
  ignores: [
    '.nuxt/',
    '.output/',
    'dist/',
    '.data/',
    'server/database/migrations/**',
    'pnpm-lock.yaml',
  ],
}
