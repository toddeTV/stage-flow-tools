/** Validates API CORS settings before the server accepts requests. */
export default defineNitroPlugin(() => {
  validateApiCorsConfig(useRuntimeConfig())
})
