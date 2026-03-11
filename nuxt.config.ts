import { version } from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  
  devtools: {
    enabled: true
  },
  
  modules: [
    '@nuxt/eslint',
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
  ],

  i18n: {
    locales: [
      { code: 'en', language: 'en-US', name: 'English' },
      { code: 'de', language: 'de-DE', name: 'Deutsch' },
      { code: 'ja', language: 'ja-JP', name: '日本語' }
    ],
    defaultLocale: 'en',
    vueI18n: './i18n.config.ts' // Using a separate file for better organization
  },

  css: [
    '~/../assets/css/main.css'
  ],

  ssr: false,
  
  nitro: {
    experimental: {
      websocket: true
    }
  },
  
  typescript: {
    shim: false
  },
  
  eslint: { // for `@nuxt/eslint`
    config: {
      stylistic: {
        indent: 2,
        quotes: 'single',
      },
    },
  },

  runtimeConfig: {
    // Private keys (only available server-side)
    adminUsername: 'admin',
    adminPassword: '123',
    jwtSecret: 'tryUJ0zQbstPbTOrezme+Fv+KndzDNRx5lmSeelr2ial2/2yV8HqLeQ2felJafqf',
    
    // Public keys (available on both client and server)
    public: {
      wsUrl: '',
      apiUrl: '',
      host: '0.0.0.0',
      port: '3000',
      debug: {
        showWebsocketConnectionsInFrontend: false,
        showConsoleOutputs: false
      },
      version: version,
      emojiCooldownMs: 1500
    }
  },

  tailwindcss: { // for Nuxt module `@nuxtjs/tailwindcss`
  }
})
