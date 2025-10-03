// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  
  devtools: {
    enabled: true
  },
  
  modules: [
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
    jwtSecret: '2ZNmOJVKLXg6Gr2ckr4T166FU0IFzVQpYu7eYwmSw5TUQmnzuhTbkHUW9pGvepx4',
    
    // Public keys (available on both client and server)
    public: {
      wsUrl: '',
      apiUrl: '',
      host: '0.0.0.0',
      port: '3000'
    }
  }
})
