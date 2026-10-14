// @vitest-environment happy-dom
import { computed, ref, watch } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useAdminQuestions } from './useAdminQuestions'

const commitSha = 'ab'.repeat(20)
const question = {
  key: 'example',
  question_text: { en: 'Question' },
  answer_options: [
    { text: { en: 'One' } },
    { text: { en: 'Two' } },
  ],
  is_disabled: false,
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('useApiError', () => ({ getErrorMessage: () => 'Request failed' }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useLocalization', () => ({}))
  vi.stubGlobal('useFetch', () => ({ data: ref([]), error: ref(), refresh: vi.fn() }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('question package export build metadata', () => {
  it('includes the installed SHA in the downloaded package', async () => {
    vi.stubGlobal('$fetch', async (path: string) => path === '/api/admin/build-info' ? { commitSha } : [
      question,
    ])
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:test')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const admin = useAdminQuestions()
    await admin.exportQuestions()
    const blob = createObjectURL.mock.calls[0]?.[0] as Blob | undefined
    expect(blob).toBeDefined()
    expect(JSON.parse(await blob!.text())).toMatchObject({ version: 1, commitSha, questions: [
      question,
    ] })
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })

  it('refuses to export when the installed SHA is unavailable', async () => {
    vi.stubGlobal('$fetch', async (path: string) => path === '/api/admin/build-info' ? { commitSha: null } : [
      question,
    ])
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const admin = useAdminQuestions()
    await admin.exportQuestions()
    expect(admin.exportError.value).toBe('questionPackageExportCommitUnknown')
    expect(click).not.toHaveBeenCalled()
  })
})
