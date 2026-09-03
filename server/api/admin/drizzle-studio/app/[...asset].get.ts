import { verifyAdmin } from '../../../../utils/auth'
import { StudioAssetPathSchema } from '#shared/utils/validation'

const DRIZZLE_STUDIO_APP_ORIGIN = 'https://local.drizzle.studio'
const DRIZZLE_STUDIO_ASSET_FETCH_TIMEOUT_MS = 8000
const FORWARDED_HEADERS = [
  'cache-control',
  'content-type',
  'etag',
  'last-modified',
]

export default defineApiHandler(async (event) => {
  await verifyAdmin(event)

  const rawAssetPath = event.context.params?.asset

  if (!rawAssetPath) {
    throwApiError(404, 'studio.asset_not_found')
  }

  const assetPath = parseValidatedValue<string>(
    rawAssetPath,
    StudioAssetPathSchema,
    'studio.asset_path_invalid',
  )

  const requestUrl = getRequestURL(event)
  const upstreamUrl = `${DRIZZLE_STUDIO_APP_ORIGIN}/${assetPath}${requestUrl.search}`
  let response: Response

  try {
    response = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(DRIZZLE_STUDIO_ASSET_FETCH_TIMEOUT_MS),
    })
  }
  catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'

    throwApiError(
      isAbort ? 504 : 502,
      isAbort ? 'studio.asset_timeout' : 'studio.asset_unavailable',
    )
  }

  if (!response.ok) {
    throwApiError(response.status, 'studio.asset_load_failed')
  }

  setResponseStatus(event, response.status, response.statusText)

  for (const header of FORWARDED_HEADERS) {
    const value = response.headers.get(header)

    if (value) {
      setHeader(event, header, value)
    }
  }

  return new Uint8Array(await response.arrayBuffer())
})
