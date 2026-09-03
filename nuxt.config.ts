import tailwindcss from '@tailwindcss/vite'
import { version } from './package.json'
import type { ConfigLayerMeta, InputConfig } from 'c12'
import type { NuxtConfig } from 'nuxt/schema'

const configBase: InputConfig<NuxtConfig, ConfigLayerMeta> = {
  compatibilityDate: '2025-07-15',

  css: [
    '~/assets/css/main.css', // including TailwindCSS
  ],

  devtools: {
    enabled: true,
  },

  nitro: {
    experimental: {
      websocket: true,
    },
  },

  runtimeConfig: {
    // Private keys (only available server-side)
    adminPassword: '123',
    adminToken: '',
    adminUsername: 'admin',
    drizzleStudioInternalPort: '64983',
    emojiBatchMaxSize: 1200,
    emojiBatchTickMs: 150,
    emojiQueueMaxSize: 25000,
    jwtSecret: 'tryUJ0zQbstPbTOrezme+Fv+KndzDNRx5lmSeelr2ial2/2yV8HqLeQ2felJafqf',

    // Public keys (available on both client and server)
    public: {
      apiUrl: '',
      debug: {
        showConsoleOutputs: false,
        showWebsocketConnectionsInFrontend: false,
      },
      emojiCooldownMs: 1500,
      host: '0.0.0.0',
      port: '3000',
      version,
      wsUrl: '',
    },
  },

  ssr: false,

  typescript: {
    shim: false,
  },

  vite: {
    optimizeDeps: {
      include: [
        '@paralleldrive/cuid2',
      ],
    },
    plugins: [
      tailwindcss(),
    ],
  },
}

const configModules: InputConfig<NuxtConfig, ConfigLayerMeta> = {
  eslint: { // for `@nuxt/eslint`
    config: {
      stylistic: false,
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English' },
      { code: 'de', language: 'de-DE', name: 'Deutsch' },
      { code: 'ja', language: 'ja-JP', name: '日本語' },
    ],
  },
}

export default defineNuxtConfig({
  icon: {
    clientBundle: {
      icons: [
        'ph:arrow-down',
        'ph:arrow-up',
        'ph:pencil',
        'ph:trash',
      ],
      scan: false,
    },
    provider: 'none',
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxtjs/i18n',
    '@vueuse/nuxt',
  ],

  ...configBase,
  ...configModules,
})
