import { defineNitroPlugin } from 'nitropack/runtime'

import { validateApiCorsConfig } from '../utils/api-cors'

/** Validates API CORS settings before the server accepts requests. */
export default defineNitroPlugin(() => {
  validateApiCorsConfig(useRuntimeConfig())
})
