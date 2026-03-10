import { version } from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  
  devtools: {
    enabled: true
  },
  
  modules: [ // try stick to alphabetically sorted
    '@nuxtjs/i18n',
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    process.env.NODE_ENV === 'development' ? 'nuxt-mcp' : null
  ].filter(Boolean),

  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', name: 'English' },
      { code: 'de', iso: 'de-DE', name: 'Deutsch' },
      { code: 'ja', iso: 'ja-JP', name: '日本語' }
    ],
    defaultLocale: 'en',
    vueI18n: './i18n.config.ts' // Using a separate file for better organization
  },

  css: [
    '~/../assets/css/tailwind.css'
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
