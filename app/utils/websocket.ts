/**
 * Constructs a WebSocket endpoint URL.
 * @param path - The specific WebSocket path (e.g., 'default' or 'emojis').
 * @param params - Optional query parameters to append to the URL.
 * @returns The fully constructed WebSocket URL.
 */
export function getWsEndpoint(path: string, params: Record<string, string> = {}): string {
  if (import.meta.server) {
    return ''
  }

  const config = useRuntimeConfig()
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = config.public.wsUrl || window.location.host
  const baseUrl = config.public.wsUrl ? `${config.public.wsUrl}/_ws/${path}` : `${protocol}//${host}/_ws/${path}`

  const url = new URL(baseUrl)
  for (const key in params) {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      const value = params[key]
      if (value !== undefined) {
        url.searchParams.append(key, value)
      }
    }
  }

  return url.toString()
}