/** Fails startup when emoji batching configuration is unsafe. */
export default defineNitroPlugin(() => {
  validateEmojiBatchingConfig(useRuntimeConfig())
})
