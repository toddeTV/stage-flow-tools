// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import { formatCssConfig } from './eslint.config.format-css.mjs'
import { formatHtmlConfig } from './eslint.config.format-html.mjs'
import { formatMarkdownConfig } from './eslint.config.format-markdown.mjs'
import { globalIgnoresConfig } from './eslint.config.global-ignores.mjs'
import { jsonAndJsoncConfigs } from './eslint.config.jsonc.mjs'
import { maxLenDisabledConfig } from './eslint.config.max-len-disabled.mjs'
import { nuxtConfigSortingConfig } from './eslint.config.nuxt.mjs'
import { stylisticConfig } from './eslint.config.stylistic.mjs'
import { tailwindConfigs } from './eslint.config.tailwind.mjs'
import { trailingSpacesConfig } from './eslint.config.trailing-spaces.mjs'
import { vueConfig } from './eslint.config.vue.mjs'
import { yamlConfigs } from './eslint.config.yaml.mjs'

export default withNuxt(
  globalIgnoresConfig, // Global ignores
  ...jsonAndJsoncConfigs, // JSON / JSONC support
  trailingSpacesConfig, // Trailing spaces for JSON, JSONC, and YAML
  ...yamlConfigs, // YAML support
  formatCssConfig, // Prettier formatting for CSS
  formatHtmlConfig, // Prettier formatting for HTML
  formatMarkdownConfig, // Stylistic formatting for Markdown
  stylisticConfig, // Stylistic overrides
  ...tailwindConfigs, // Tailwind CSS class sorting
  nuxtConfigSortingConfig, // Nuxt config object sorting
  vueConfig, // Vue rules
  maxLenDisabledConfig, // Disable max-len in Markdown and YAML
)
