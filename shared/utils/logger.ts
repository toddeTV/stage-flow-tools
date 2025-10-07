/**
 * Global logger function that conditionally logs messages or objects to the console.
 * This function serves as the core logging utility shared across both client and server contexts.
 * It respects the `showConsoleOutputs` flag, providing centralized control over debug output
 * across the entire application. Uses `console.dir` for better object inspection capabilities.
 *
 * @param data - The data to be logged, which can be of any type (e.g., string, object, array, Error).
 * @param showConsoleOutputs - Boolean flag that determines whether logging is enabled. When `false`, no output is produced.
 * @param options - Optional parameters for `console.dir`, such as `{ depth: null }` to display deeply nested objects fully,
 *                  or `{ colors: true }` for colored output (in Node.js environments).
 *
 * @example
 * ```typescript
 * // Basic logging (will only output if showConsoleOutputs is true)
 * global_logger('Processing request', true)
 *
 * // Deep object inspection
 * global_logger(complexObject, true, { depth: null })
 *
 * // Disabled logging
 * global_logger('This will not appear', false)
 * ```
 */
export function global_logger(data: unknown, showConsoleOutputs: boolean, options?: unknown): void {
  if (showConsoleOutputs) {
    console.dir(data, options)
  }
}

/**
 * Global error logger that unconditionally logs error messages or objects to the console.
 * This function serves as the core error logging utility shared across both client and server contexts.
 * Unlike `global_logger`, this function always outputs to the console using `console.error`,
 * ensuring that critical errors are never silenced regardless of debug settings.
 *
 * @param data - The error data to be logged, typically an Error object but can be any type (e.g., string, object).
 * @param optionalParams - Additional parameters to be logged alongside the error data, useful for providing context
 *                         such as stack traces, request information, or related data.
 *
 * @example
 * ```typescript
 * // Log a simple error message
 * global_logger_error('Critical failure occurred')
 *
 * // Log an Error object with context
 * global_logger_error(error, 'User ID:', userId, 'Endpoint:', endpoint)
 *
 * // Log with multiple contextual parameters
 * global_logger_error(new Error('Database timeout'), { query: 'SELECT ...', timeout: 5000 })
 * ```
 */
export function global_logger_error(data: unknown, ...optionalParams: any[]): void {
  console.error(data, ...optionalParams)
}
