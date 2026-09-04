import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

const questionPageSource = readFileSync(fileURLToPath(new URL('./questions.vue', import.meta.url)), 'utf8')

describe('admin question package import preview', () => {
  it('requires a successful refresh before importing a selected package', () => {
    expect(questionPageSource).toContain('const isImportPreviewReady = ref(false)')
    expect(questionPageSource).toContain('isImportPreviewReady.value = false')
    expect(questionPageSource).toContain('isImportPreviewReady.value = true')
    expect(questionPageSource).toContain('const requestId = ++importPreviewRequestId')
    expect(questionPageSource).toContain('if (requestId === importPreviewRequestId)')
    expect(questionPageSource).toContain('function returnToQuestionChoices()')
    expect(questionPageSource).toContain(
      'if (!isImportPreviewReady.value || isImportingQuestions.value || isPreparingImportPreview.value)',
    )
  })
})
