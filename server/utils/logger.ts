/**
 * Logs messages or objects to the console if enabled in the runtime config.
 * This function serves as a centralized logger that respects the `showConsoleOutputs`
 * setting, providing a way to control debug output across the application.
 * It uses `console.dir` to allow for more detailed object inspection.
 *
 * @param data - The data to be logged, which can be of any type (e.g., string, object, array).
 * @param options - Optional parameters for `console.dir`, such as `{ depth: null }` to display nested objects fully.
 */
export function logger(data: unknown, options?: unknown): void {
  const config = useRuntimeConfig()
  const showConsoleOutputs = config.public.debug.showConsoleOutputs

  if (showConsoleOutputs) {
    console.dir(data, options)
  }
}

/**
 * Logs error messages or objects to the console using `console.error`.
 * Unlike the `logger` function, this always outputs to the console regardless
 * of the `showConsoleOutputs` setting, ensuring critical errors are never silenced.
 *
 * @param data - The error data to be logged, which can be of any type (e.g., Error object, string, object).
 * @param optionalParams - Additional parameters to be logged alongside the error data.
 */
export function logger_error(data: unknown, ...optionalParams: any[]): void {
  console.error(data, optionalParams)
}
