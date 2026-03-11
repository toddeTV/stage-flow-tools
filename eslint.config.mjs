// @ts-check
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import pluginStylistic from '@stylistic/eslint-plugin'
import pluginFormat from 'eslint-plugin-format'
import * as pluginJsonc from 'eslint-plugin-jsonc'
import pluginTailwindCSS from 'eslint-plugin-tailwindcss'
import * as pluginYml from 'eslint-plugin-yml'

import withNuxt from './.nuxt/eslint.config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default withNuxt(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: [
      '.nuxt/',
      '.output/',
      'dist/',
      '.data/',
      '.claude/skills/**/.skilld/',
      'pnpm-lock.yaml',
    ],
  },

  // ── JSON / JSONC support ────────────────────────────────────────────────────
  ...pluginJsonc.configs['flat/recommended-with-jsonc'],
  {
    files: [
      '**/*.json',
      '**/*.jsonc',
    ],
    rules: {
      'jsonc/sort-keys': 'error',
    },
  },
  {
    // Disable JSONC sort-keys for files where key order is meaningful
    files: [
      '.vscode/settings.json',
      'package.json',
      'tsconfig.json',
    ],
    rules: {
      'jsonc/sort-keys': 'off',
    },
  },

  // ── YAML support ────────────────────────────────────────────────────────────
  ...pluginYml.configs['flat/standard'],

  // ── Prettier formatting for CSS ─────────────────────────────────────────────
  {
    files: [
      '**/*.css',
    ],
    languageOptions: {
      parser: pluginFormat.parserPlain,
    },
    plugins: {
      format: pluginFormat,
    },
    rules: {
      'format/prettier': ['error', { parser: 'css' }],
    },
  },

  // ── Prettier formatting for HTML ────────────────────────────────────────────
  {
    files: [
      '**/*.html',
    ],
    languageOptions: {
      parser: pluginFormat.parserPlain,
    },
    plugins: {
      format: pluginFormat,
    },
    rules: {
      'format/prettier': ['error', { parser: 'html' }],
    },
  },

  // ── Prettier formatting for Markdown ────────────────────────────────────────
  {
    files: [
      '**/*.md',
    ],
    languageOptions: {
      parser: pluginFormat.parserPlain,
    },
    plugins: {
      format: pluginFormat,
    },
    rules: {
      'format/prettier': ['error', { parser: 'markdown' }],
    },
  },

  // ── Stylistic overrides ─────────────────────────────────────────────────────
  {
    files: [
      '**/*.js',
      '**/*.mjs',
      '**/*.ts',
      '**/*.vue',
    ],
    plugins: {
      '@stylistic': pluginStylistic,
    },
    rules: {
      '@stylistic/max-len': ['error', {
        code: 120,
        // Ignore SVG path d attributes and inline data-URI background images
        ignorePattern: String.raw`^\s*d="|url\(["']data:image`,
      }],
    },
  },

  // ── Vue rules ───────────────────────────────────────────────────────────────
  {
    files: [
      '**/*.vue',
    ],
    rules: {
      'vue/attributes-order': ['error', {
        alphabetical: true,
      }],
      'vue/max-attributes-per-line': ['error', {
        multiline: 1,
        singleline: 3,
      }],
    },
  },

  // ── Tailwind CSS class sorting ──────────────────────────────────────────────
  // @ts-expect-error - pluginTailwindCSS types diverge from ESLint flat config Plugin type
  {
    files: [
      '**/*.{js,mjs,ts,vue}',
    ],
    plugins: {
      tailwindcss: pluginTailwindCSS,
    },
    rules: {
      'tailwindcss/classnames-order': 'error',
      'tailwindcss/no-custom-classname': 'off',
    },
    settings: {
      tailwindcss: {
        config: resolve(__dirname, 'app/assets/css/main.css'),
      },
    },
  },

  // ── Disable max-len in Markdown & YAML ──────────────────────────────────────
  {
    files: [
      '**/*.md',
      '**/*.yaml',
      '**/*.yml',
    ],
    rules: {
      '@stylistic/max-len': 'off',
    },
  },
)
