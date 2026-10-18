import { validateAuthConfig } from '../utils/auth-config'

/** Rejects missing or published default auth secrets before serving requests. */
export default defineNitroPlugin(() => {
  validateAuthConfig(useRuntimeConfig())
})
