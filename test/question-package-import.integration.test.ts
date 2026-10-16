import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { applyLocalMigrations, createLocalDatabaseClient } from '../server/database/local-sqlite'
import { createQuestion, getQuestions, importQuestionPackage as persistQuestionPackage } from '../server/utils/storage'
import { createQuestionPackage as exportQuestionPackage } from '../app/utils/question-package'
import { getRequestURL } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  defineApiHandler,
  parseValidatedValue,
  readValidatedRequestBody,
  throwApiError,
} from '../server/utils/api-errors'
import { verifyAdmin } from '../server/utils/auth'
import { requestRoute } from './helpers/h3'

const commitSha = 'ab'.repeat(20)
const otherSha = 'cd'.repeat(20)
const importQuestionPackage = vi.fn()
const broadcast = vi.fn()
const cancelPendingResultsUpdate = vi.fn()
const questionPackage = {
  format: 'stage-flow-tools.question-package',
  version: 1,
  questions: [
    {
      question_text: { en: 'Question' },
      answer_options: [
        { text: { en: 'One' } },
        { text: { en: 'Two' } },
      ],
      is_disabled: false,
    },
  ],
}

beforeEach(() => {
  vi.stubGlobal('__STAGE_FLOW_BUILD_COMMIT_SHA__', commitSha)
  vi.stubGlobal('broadcast', broadcast)
  vi.stubGlobal('cancelPendingResultsUpdate', cancelPendingResultsUpdate)
  vi.stubGlobal('defineApiHandler', defineApiHandler)
  vi.stubGlobal('getRequestURL', getRequestURL)
  vi.stubGlobal('importQuestionPackage', importQuestionPackage)
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('parseValidatedValue', parseValidatedValue)
  vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
  vi.stubGlobal('throwApiError', throwApiError)
  vi.stubGlobal('useRuntimeConfig', () => ({ adminToken: 'test-admin-token', jwtSecret: 'test-secret' }))
  vi.stubGlobal('verifyAdmin', verifyAdmin)
  importQuestionPackage.mockResolvedValue({ createdCount: 1, updatedCount: 0 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

async function requestImport(body: unknown = questionPackage, query = '', authenticated = true) {
  const { default: route } = await import('../server/api/questions/import.post')
  return requestRoute(route, `/api/questions/import${query}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authenticated ? { authorization: 'Bearer test-admin-token' } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function expectRejected(response: Response, status: number, code: string) {
  expect(response.status).toBe(status)
  await expect(response.json()).resolves.toMatchObject({ data: { code } })
  expect(importQuestionPackage).not.toHaveBeenCalled()
  expect(broadcast).not.toHaveBeenCalled()
  expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
}

describe('question package commit checks at the HTTP boundary', () => {
  it('requires admin authorization before importing or disclosing build metadata', async () => {
    await expectRejected(await requestImport(questionPackage, '', false), 401, 'auth.token_required')
    const { default: route } = await import('../server/api/admin/build-info.get')
    const unauthorized = await requestRoute(route, '/api/admin/build-info')
    expect(unauthorized.status).toBe(401)
    const authorized = await requestRoute(route, '/api/admin/build-info', {
      headers: { authorization: 'Bearer test-admin-token' },
    })
    expect(authorized.headers.get('cache-control')).toBe('no-store')
    await expect(authorized.json()).resolves.toEqual({ commitSha })
  })

  it.each([
    undefined,
    commitSha,
    commitSha.toUpperCase(),
  ])('imports absent or matching SHA without an override: %s', async (sha) => {
    const response = await requestImport({ ...questionPackage, commitSha: sha })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ createdCount: 1, updatedCount: 0 })
    expect(importQuestionPackage).toHaveBeenCalledOnce()
  })

  it.each([
    '',
    `?confirmedCommitSha=${otherSha}`,
    '?confirmedCommitSha=unknown',
  ])('rejects a mismatch without confirmation of this installation: %s', async (query) => {
    await expectRejected(await requestImport({ ...questionPackage, commitSha: otherSha }, query),
      409, 'quiz.question_package_commit_confirmation_required')
  })

  it('imports a different commit only with confirmation bound to the installed SHA', async () => {
    const response = await requestImport(
      { ...questionPackage, commitSha: otherSha }, `?confirmedCommitSha=${commitSha}`,
    )
    expect(response.status).toBe(200)
    expect(importQuestionPackage).toHaveBeenCalledOnce()
  })

  it('rejects stale confirmation after a deployment change', async () => {
    vi.stubGlobal('__STAGE_FLOW_BUILD_COMMIT_SHA__', 'ef'.repeat(20))
    const response = await requestImport(
      { ...questionPackage, commitSha: otherSha }, `?confirmedCommitSha=${commitSha}`,
    )
    await expectRejected(response,
      409, 'quiz.question_package_commit_confirmation_required')
  })

  it.each([
    undefined,
    '',
    'invalid',
  ])('requires explicit confirmation when runtime SHA is unavailable: %s', async (sha) => {
    vi.stubGlobal('__STAGE_FLOW_BUILD_COMMIT_SHA__', sha)
    const { default: route } = await import('../server/api/admin/build-info.get')
    const info = await requestRoute(route, '/api/admin/build-info', {
      headers: { authorization: 'Bearer test-admin-token' },
    })
    await expect(info.json()).resolves.toEqual({ commitSha: null })
    await expectRejected(await requestImport(), 409, 'quiz.question_package_commit_confirmation_required')
    expect((await requestImport(questionPackage, '?confirmedCommitSha=unknown')).status).toBe(200)
  })

  it.each([
    0,
    2,
    '1',
    undefined,
    null,
  ])('never overrides a wrong or missing version with SHA confirmation: %s', async (version) => {
    const response = await requestImport(
      { ...questionPackage, version, commitSha: otherSha }, `?confirmedCommitSha=${commitSha}`,
    )
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ data: {
      code: 'validation.invalid_request',
      issues: [
        {
          code: version === undefined
            ? 'validation.invalid_question_package'
            : 'validation.unsupported_question_package_version',
          path: [
            'version',
          ],
        },
      ],
    } })
    expect(importQuestionPackage).not.toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()
  })

  it.each([
    'abcdef0',
    '',
    null,
    'z'.repeat(40),
  ])('rejects malformed package SHA: %s', async (sha) => {
    await expectRejected(await requestImport({ ...questionPackage, commitSha: sha }), 400, 'validation.invalid_request')
  })

  it('persists author metadata through import/export and rejects keys added after preview', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'stage-flow-package-'))
    const client = createLocalDatabaseClient(join(directory, 'test.sqlite3'))
    applyLocalMigrations(client.db)
    globalThis.__stageFlowToolsLocalDatabaseClient = client
    importQuestionPackage.mockImplementation(persistQuestionPackage)

    try {
      const authoredAt = '2020-02-29T12:00:00.000Z'
      const body = {
        ...questionPackage,
        questions: [
          { ...questionPackage.questions[0], key: 'authored', meta: { authoredAt } },
        ],
      }
      const imported = await requestImport(body)
      expect(imported.status).toBe(200)
      const stored = await getQuestions()
      expect(stored[0]).toMatchObject({ authoredAt })
      expect(stored[0]?.createdAt).not.toBe(authoredAt)
      expect(exportQuestionPackage(stored, commitSha).questions[0]?.meta).toEqual({ authoredAt })

      // Another administrator adds the key after the client's preview.
      await createQuestion({
        key: 'stale-preview', question_text: { en: 'Existing' },
        answer_options: [
          { text: { en: 'One' } },
          { text: { en: 'Two' } },
        ],
      })
      const before = await getQuestions()
      const conflict = await requestImport({
        ...questionPackage,
        questions: [
          { ...questionPackage.questions[0], key: 'new-before-conflict' },
          { ...questionPackage.questions[0], key: 'stale-preview' },
        ],
      })
      expect(conflict.status).toBe(409)
      await expect(conflict.json()).resolves.toMatchObject({ data: { code: 'quiz.question_key_conflict' } })
      await expect(getQuestions()).resolves.toEqual(before)
      expect(broadcast).not.toHaveBeenCalled()
      expect(cancelPendingResultsUpdate).not.toHaveBeenCalled()
    }
    finally {
      globalThis.__stageFlowToolsLocalDatabaseClient = undefined
      client.sqlite.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('rejects an invalid author date before storage or broadcasts', async () => {
    await expectRejected(await requestImport({
      ...questionPackage,
      questions: [
        { ...questionPackage.questions[0], meta: { authoredAt: '2023-02-29T12:00:00Z' } },
      ],
    }), 400, 'validation.invalid_request')
  })

  it('validates confirmation parameters before writes', async () => {
    await expectRejected(await requestImport(questionPackage, '?confirmedCommitSha=invalid'),
      400, 'validation.invalid_request')
    const repeatedQuery = '?confirmedCommitSha=unknown&confirmedCommitSha=unknown'
    await expectRejected(await requestImport(questionPackage, repeatedQuery), 400, 'validation.invalid_request')
  })
})
