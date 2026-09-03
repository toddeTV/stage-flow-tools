import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vite-plus/test'

const schemaValidatedPostRoutes = [
  'server/api/answers/reset.post.ts',
  'server/api/answers/retract.post.ts',
  'server/api/answers/submit.post.ts',
  'server/api/auth/login.post.ts',
  'server/api/auth/logout.post.ts',
  'server/api/emojis/submit.post.ts',
  'server/api/questions/create.post.ts',
  'server/api/questions/delete.post.ts',
  'server/api/questions/move.post.ts',
  'server/api/questions/publish-next.post.ts',
  'server/api/questions/publish.post.ts',
  'server/api/questions/toggle-disabled.post.ts',
  'server/api/questions/toggle-lock.post.ts',
  'server/api/questions/unpublish-active.post.ts',
  'server/api/questions/update.post.ts',
  'server/api/results/pick-random-user.post.ts',
]

const authenticatedRouteSources = [
  'server/api/answers/reset.post.ts',
  'server/api/questions/create.post.ts',
  'server/api/questions/delete.post.ts',
  'server/api/questions/move.post.ts',
  'server/api/questions/publish-next.post.ts',
  'server/api/questions/publish.post.ts',
  'server/api/questions/toggle-disabled.post.ts',
  'server/api/questions/toggle-lock.post.ts',
  'server/api/questions/unpublish-active.post.ts',
  'server/api/questions/update.post.ts',
  'server/api/results/pick-random-user.post.ts',
  'server/routes/index.post.ts',
]

async function readSource(relativePath: string): Promise<string> {
  return readFile(resolve(process.cwd(), relativePath), 'utf8')
}

describe('POST response contract', () => {
  it.each(schemaValidatedPostRoutes)('%s validates input and wraps unexpected errors', async (path) => {
    const source = await readSource(path)

    expect(source).toContain('defineApiHandler')
    expect(source).toContain('readValidatedRequestBody')
    expect(source).not.toContain('createError(')
  })

  it('keeps the opaque Drizzle Studio RPC body as the documented exception', async () => {
    const source = await readSource('server/routes/index.post.ts')

    expect(source).toContain('defineApiHandler')
    expect(source).toContain('readRawBody')
    expect(source).toContain('throwApiError(')
  })

  it.each(authenticatedRouteSources)('%s delegates authentication failures to verifyAdmin', async (path) => {
    const source = await readSource(path)

    expect(source).toContain('await verifyAdmin(event)')
  })

  it('serializes both authentication failure branches as codes', async () => {
    const source = await readSource('server/utils/auth.ts')

    expect(source).toContain("throwApiError(401, 'auth.token_required')")
    expect(source).toContain("throwApiError(401, 'auth.token_invalid')")
  })

  it('clears live question and results state when the active question is deleted', async () => {
    const source = await readSource('server/api/questions/delete.post.ts')

    expect(source).toContain('clearScheduledResultsUpdate(WebSocketChannel.RESULTS)')
    expect(source).toContain("broadcast('new-question', null)")
    expect(source).toContain("broadcast('results-update', null, WebSocketChannel.RESULTS)")
  })

  it('cancels buffered results when the active question is unpublished', async () => {
    const source = await readSource('server/api/questions/unpublish-active.post.ts')

    expect(source).toContain('clearScheduledResultsUpdate(WebSocketChannel.RESULTS)')
  })

  it('broadcasts active question edits to connected participants', async () => {
    const source = await readSource('server/api/questions/update.post.ts')

    expect(source).toContain('if (question.is_active)')
    expect(source).toContain("broadcast('new-question', question)")
  })
})
