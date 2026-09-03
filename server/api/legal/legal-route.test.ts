import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

const routeSource = readFileSync(fileURLToPath(new URL('./[key].get.ts', import.meta.url)), 'utf8')

describe('public legal-document route', () => {
  it('provides read-only access only to the two configured document keys', () => {
    expect(routeSource).toContain('defineApiHandler')
    expect(routeSource).toContain("getRouterParam(event, 'key')")
    expect(routeSource).toContain('isLegalDocumentKey(key)')
    expect(routeSource).toContain('getLegalDocument(key) ?? null')
    expect(routeSource).not.toContain('verifyAdmin')
  })
})
