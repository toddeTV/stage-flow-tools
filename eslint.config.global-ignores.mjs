/** @type {import('eslint').Linter.FlatConfig} */
export const globalIgnoresConfig = {
  ignores: [
    '.nuxt/',
    '.output/',
    'dist/',
    '.data/',
    'server/database/migrations/**',
    '.claude/skills/**/.skilld/',
    '.claude/skills/skilld-lock.yaml',
    'pnpm-lock.yaml',
  ],
}
