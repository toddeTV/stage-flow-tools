type EmojiBatchingRuntimeConfig = {
  emojiBatchMaxSize: unknown
  emojiBatchTickMs: unknown
  emojiQueueMaxSize: unknown
}

function requirePositiveSafeInteger(value: unknown, key: string): void {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Invalid runtime config ${key}: expected a positive safe integer.`)
  }
}

/** Validates server-side emoji batching settings before the server accepts requests. */
export function validateEmojiBatchingConfig(config: EmojiBatchingRuntimeConfig): void {
  requirePositiveSafeInteger(config.emojiBatchTickMs, 'emojiBatchTickMs')
  requirePositiveSafeInteger(config.emojiBatchMaxSize, 'emojiBatchMaxSize')
  requirePositiveSafeInteger(config.emojiQueueMaxSize, 'emojiQueueMaxSize')
}
