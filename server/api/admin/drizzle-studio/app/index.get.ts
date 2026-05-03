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

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  let response: Response

  try {
    response = await fetch(`${DRIZZLE_STUDIO_APP_ORIGIN}/`, {
      signal: AbortSignal.timeout(DRIZZLE_STUDIO_SHELL_FETCH_TIMEOUT_MS),
    })
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'

    throw createError({
      statusCode: isAbort ? 504 : 502,
      statusMessage: isAbort
        ? 'Timed out loading Drizzle Studio shell'
        : 'Failed to reach Drizzle Studio upstream',
      data: error instanceof Error ? { message: error.message } : undefined,
    })
  }

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Failed to load Drizzle Studio (${response.status})`,
    })
  }

  setHeader(
    event,
    'content-type',
    response.headers.get('content-type') || 'text/html; charset=utf-8',
  )
  setHeader(event, 'cache-control', 'no-store')

  return sanitizeStudioHtml(await response.text())
})
