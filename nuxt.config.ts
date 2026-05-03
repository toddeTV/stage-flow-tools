import { version } from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  compatibilityDate: '2025-07-15',

  css: [
    '~/assets/css/main.css',
  ],

  devtools: {
    enabled: true,
  },

  eslint: { // for `@nuxt/eslint`
    config: {
      stylistic: {
        indent: 2,
        quotes: 'single',
      },
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: [
      { code: 'en', language: 'en-US', name: 'English' },
      { code: 'de', language: 'de-DE', name: 'Deutsch' },
      { code: 'ja', language: 'ja-JP', name: '日本語' },
    ],
    vueI18n: './i18n.config.ts', // Using a separate file for better organization
  },
  modules: [
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],

  nitro: {
    devStorage: {
      data: { base: './.data/db', driver: 'fs' },
    },
    experimental: {
      websocket: true,
    },
    storage: {
      data: { base: './.data/db', driver: 'fs' },
    },
  },

  runtimeConfig: {
    // Private keys (only available server-side)
    adminPassword: '123',
    adminUsername: 'admin',
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

  tailwindcss: { // for Nuxt module `@nuxtjs/tailwindcss`
  },

  typescript: {
    shim: false,
  },
})
