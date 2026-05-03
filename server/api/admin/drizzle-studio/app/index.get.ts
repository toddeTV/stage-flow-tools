import { verifyAdmin } from '../../../../utils/auth'

const DRIZZLE_STUDIO_APP_ORIGIN = 'https://local.drizzle.studio'

/** Removes third-party analytics from the upstream Studio shell. */
function sanitizeStudioHtml(html: string) {
  const analyticsScript = new RegExp(
    '<script defer="defer" data-site-id="local\\.drizzle\\.studio" '
    + 'src="https:\\/\\/assets\\.onedollarstats\\.com\\/stonks\\.js"><\\/script>',
  )

  return html.replace(analyticsScript, '')
}

export default defineEventHandler(async (event) => {
  await verifyAdmin(event)

  const response = await fetch(`${DRIZZLE_STUDIO_APP_ORIGIN}/`)

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
