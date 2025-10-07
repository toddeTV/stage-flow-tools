import { version } from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  
  devtools: {
    enabled: true
  },
  
  modules: [ // try stick to alphabetically sorted
    '@nuxtjs/tailwindcss',
    '@vueuse/nuxt',
    process.env.NODE_ENV === 'development' ? 'nuxt-mcp' : null
  ].filter(Boolean),

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
      version: version
    }
  },

  tailwindcss: { // for Nuxt module `@nuxtjs/tailwindcss`
  }
})
