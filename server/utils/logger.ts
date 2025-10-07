/**
 * Server-side logger that wraps the global logger with runtime config awareness.
 * Logs messages or objects to the console if enabled in the runtime configuration.
 * This function automatically retrieves the `showConsoleOutputs` setting from the
 * Nuxt runtime config and passes it to the global logger.
 *
 * @param data - The data to be logged, which can be of any type (e.g., string, object, array).
 * @param options - Optional parameters for `console.dir`, such as `{ depth: null }` to display nested objects fully.
 *
 * @example
 * ```typescript
 * // Simple logging
 * logger('Server started')
 *
 * // Logging with options for deep object inspection
 * logger(complexObject, { depth: null })
 * ```
 */
export function logger(data: unknown, options?: unknown): void {
  const config = useRuntimeConfig()
  const showConsoleOutputs = config.public.debug.showConsoleOutputs
  global_logger(data, showConsoleOutputs, options)
}

/**
 * Server-side error logger that wraps the global error logger.
 * Logs error messages or objects to the console using `console.error`.
 * Unlike the `logger` function, this always outputs to the console regardless
 * of the `showConsoleOutputs` setting, ensuring critical errors are never silenced.
 *
 * @param data - The error data to be logged, which can be of any type (e.g., Error object, string, object).
 * @param optionalParams - Additional parameters to be logged alongside the error data.
 *
 * @example
 * ```typescript
 * // Log a simple error message
 * logger_error('Database connection failed')
 *
 * // Log an Error object with additional context
 * logger_error(error, 'Failed to process request', { userId: 123 })
 * ```
 */
export function logger_error(data: unknown, ...optionalParams: any[]): void {
  global_logger_error(data, ...optionalParams)
}
