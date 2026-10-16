import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { parseValidatedValue, throwApiError } from '../../utils/api-errors'
import { QuestionKeyConflictError } from '../../utils/storage'

const broadcast = vi.fn()
const importQuestionPackage = vi.fn()
const readValidatedRequestBody = vi.fn()
const verifyAdmin = vi.fn()

vi.stubGlobal('broadcast', broadcast)
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('importQuestionPackage', importQuestionPackage)
vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
vi.stubGlobal('parseValidatedValue', parseValidatedValue)
vi.stubGlobal('throwApiError', throwApiError)
vi.stubGlobal('__STAGE_FLOW_BUILD_COMMIT_SHA__', 'ab'.repeat(20))
vi.stubGlobal('verifyAdmin', verifyAdmin)

const { default: importQuestions } = await import('./import.post')

afterEach(() => {
  vi.resetAllMocks()
})

describe('POST /api/questions/import', () => {
  it('returns creation counts without broadcasting changes to the active question', async () => {
    readValidatedRequestBody.mockResolvedValue({})
    importQuestionPackage.mockResolvedValue({ createdCount: 2, updatedCount: 0 })
    await expect(importQuestions({} as never)).resolves.toEqual({ createdCount: 2, updatedCount: 0 })
    expect(verifyAdmin).toHaveBeenCalled()
    expect(broadcast).not.toHaveBeenCalled()
  })

  it('reports existing keys as a conflict without broadcasts', async () => {
    readValidatedRequestBody.mockResolvedValue({})
    importQuestionPackage.mockRejectedValue(new QuestionKeyConflictError())
    await expect(importQuestions({} as never)).rejects.toMatchObject({
      statusCode: 409, data: { code: 'quiz.question_key_conflict' },
    })
    expect(broadcast).not.toHaveBeenCalled()
  })
})
