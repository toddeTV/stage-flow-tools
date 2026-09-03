import { verifyAdmin } from '../../../../utils/auth'

const DRIZZLE_STUDIO_APP_ORIGIN = 'https://local.drizzle.studio'
const DRIZZLE_STUDIO_SHELL_FETCH_TIMEOUT_MS = 8000

/** Removes third-party analytics from the upstream Studio shell. */
function sanitizeStudioHtml(html: string) {
  const scriptTagPattern = /<script\b[^>]*>[\s\S]*?<\/script>/gi

  return html.replace(scriptTagPattern, (scriptTag) => {
    const normalizedTag = scriptTag.toLowerCase()

    if (
      normalizedTag.includes('assets.onedollarstats.com/stonks.js')
      || normalizedTag.includes('data-site-id="local.drizzle.studio"')
      || normalizedTag.includes("data-site-id='local.drizzle.studio'")
    ) {
      return ''
    }

    return scriptTag
  })
}

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  let response: Response

  try {
    response = await fetch(`${DRIZZLE_STUDIO_APP_ORIGIN}/`, {
      signal: AbortSignal.timeout(DRIZZLE_STUDIO_SHELL_FETCH_TIMEOUT_MS),
    })
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'

    throwApiError(
      isAbort ? 504 : 502,
      isAbort ? 'studio.shell_timeout' : 'studio.shell_unavailable',
    )
  }

  if (!response.ok) {
    throwApiError(502, 'studio.shell_load_failed')
  }

  setHeader(
    event,
    'content-type',
    response.headers.get('content-type') || 'text/html; charset=utf-8',
  )
  setHeader(event, 'cache-control', 'no-store')

  return sanitizeStudioHtml(await response.text())
})
