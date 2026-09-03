import { defineNitroPlugin } from 'nitropack/runtime'
import { validateEmojiBatchingConfig } from '../utils/emoji-batching-config'

/** Fails startup when emoji batching configuration is unsafe. */
export default defineNitroPlugin(() => {
  validateEmojiBatchingConfig(useRuntimeConfig())
})
