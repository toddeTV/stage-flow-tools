// @vitest-environment jsdom
import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  watch,
} from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import QuestionsPage from './questions.vue'
import { flushPromises } from '@vue/test-utils'
import QuestionPackageImportWizard from '~/components/questions/QuestionPackageImportWizard.vue'
import AdminBackLink from '~/components/admin/AdminBackLink.vue'
import type {
  Question,
  QuestionPackage,
} from '~/types'

const questionPackage = {
  format: 'stage-flow-tools.question-package',
  version: 2,
  questions: [
    {
      key: 'question-to-import',
      question_text: { en: 'Question to import' },
      answer_options: [
        { text: { en: 'Yes' } },
        { text: { en: 'No' } },
      ],
      is_disabled: false,
    },
  ],
} satisfies QuestionPackage

const commitSha = 'ab'.repeat(20)
const otherSha = 'cd'.repeat(20)

const UiButton = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

const Passthrough = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('div', attrs, slots.default?.())
  },
})

function createQuestion(key: string): Question {
  return {
    id: `${key}-id`,
    key,
    question_text: { en: key },
    answer_options: [
      { text: { en: 'Yes' } },
      { text: { en: 'No' } },
    ],
    is_disabled: false,
    is_locked: false,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    authoredAt: null,
    alreadyPublished: false,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button'))
    .find(candidate => candidate.textContent === label)

  if (!button) {
    throw new Error(`Button "${label}" is missing`)
  }

  return button
}

async function flushAsyncState() {
  await flushPromises()
  await nextTick()
}

async function selectQuestionPackage(container: HTMLElement, value: unknown = questionPackage) {
  const input = container.querySelector<HTMLInputElement>('#question-package-file')

  if (!input) {
    throw new Error('Question package input is missing')
  }

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [
      {
        text: async () => JSON.stringify(value),
      },
    ],
  })
  input.dispatchEvent(new Event('change'))
  await flushAsyncState()
}

function renderPage() {
  const container = document.createElement('div')
  const app = createApp(QuestionsPage)

  app.component('AdminBackLink', AdminBackLink)
  app.component('Icon', Passthrough)
  app.component('NuxtLink', Passthrough)
  app.component('QuestionPackageImportWizard', QuestionPackageImportWizard)
  app.component('UiButton', UiButton)
  app.component('UiInput', Passthrough)
  app.component('UiPageTitle', Passthrough)
  app.component('UiSection', Passthrough)
  document.body.append(container)
  app.mount(container)

  return { app, container }
}

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('logger_error', vi.fn())
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useApiError', () => ({
    getErrorCode: (error: { code?: string }) => error.code,
    getErrorMessage: () => 'Request failed',
    getIssueMessage: () => 'Invalid value',
  }))
  vi.stubGlobal('useFetch', () => ({
    data: ref<Question[]>([]),
    error: ref(),
    refresh: vi.fn(),
  }))
  vi.stubGlobal('useI18n', () => ({
    t: (key: string, values?: { count?: number }) => values?.count === undefined
      ? values ? `${key}:${JSON.stringify(values)}` : key
      : `${key}:${values.count}`,
  }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (value: { en: string }) => value.en }))
  vi.stubGlobal('watch', watch)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('admin question package import preview', () => {
  it('shows UTC authored dates and a dash for unknown dates', async () => {
    const authoredAt = '2020-02-29T12:00:00.000Z'
    const fetchedQuestions = ref<Question[]>([])
    vi.stubGlobal('useFetch', () => ({
      data: fetchedQuestions,
      error: ref(), refresh: vi.fn(),
    }))
    const rendered = renderPage()
    fetchedQuestions.value = [
      { ...createQuestion('authored'), authoredAt },
      createQuestion('unknown'),
    ]
    await flushAsyncState()
    const dates = Array.from(rendered.container.querySelectorAll('th'))
      .filter(header => header.textContent === 'authoredAt')
      .map(header => header.nextElementSibling)
    expect(dates.map(cell => cell?.textContent?.trim())).toEqual([
      authoredAt,
      '–',
    ])
    expect(dates[0]?.querySelector('time')?.dateTime).toBe(authoredAt)
    rendered.app.unmount()
  })

  it('blocks an import when refreshed questions contain a conflicting key', async () => {
    const fetchRequest = vi.fn(async (path: string) => path === '/api/admin/build-info'
      ? { commitSha } : [
        createQuestion('question-to-import'),
      ])
    vi.stubGlobal('$fetch', fetchRequest)
    const rendered = renderPage()
    findButton(rendered.container, 'importQuestions').click()
    await nextTick()
    await selectQuestionPackage(rendered.container)
    expect(importButton(rendered.container).disabled).toBe(true)
    expect(rendered.container.textContent).toContain('question-to-import')
    expect(fetchRequest.mock.calls.map(([
      path,
    ]) => path)).not.toContain('/api/questions/import')
    rendered.app.unmount()
  })

  it('keeps import disabled until the installed build metadata is available', async () => {
    const buildInfo = createDeferred<{ commitSha: string }>()
    vi.stubGlobal('$fetch', (path: string) => path === '/api/admin/build-info'
      ? buildInfo.promise
      : Promise.resolve([]))
    const rendered = renderPage()
    findButton(rendered.container, 'importQuestions').click()
    await nextTick()
    await selectQuestionPackage(rendered.container)
    expect(importButton(rendered.container).disabled).toBe(true)
    buildInfo.resolve({ commitSha })
    await flushAsyncState()
    expect(importButton(rendered.container).disabled).toBe(false)
    rendered.app.unmount()
  })

  it('keeps import disabled when build metadata cannot be loaded', async () => {
    vi.stubGlobal('$fetch', async (path: string) => {
      if (path === '/api/admin/build-info') throw new Error('Connection failed')
      return []
    })
    const rendered = renderPage()
    findButton(rendered.container, 'importQuestions').click()
    await nextTick()
    await selectQuestionPackage(rendered.container)
    expect(importButton(rendered.container).disabled).toBe(true)
    expect(rendered.container.textContent).toContain('Request failed')
    rendered.app.unmount()
  })

  it('keeps the newest question snapshot when an older refresh resolves last', async () => {
    const firstRefresh = createDeferred<Question[]>()
    const secondRefresh = createDeferred<Question[]>()
    const fetchQuestions = vi.fn()
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise)
    vi.stubGlobal('$fetch', (path: string) => path === '/api/admin/build-info'
      ? Promise.resolve({ commitSha })
      : fetchQuestions())

    const rendered = renderPage()

    findButton(rendered.container, 'importQuestions').click()
    await nextTick()

    await selectQuestionPackage(rendered.container)
    await selectQuestionPackage(rendered.container)

    expect(fetchQuestions).toHaveBeenCalledTimes(2)

    secondRefresh.resolve([
      createQuestion('question-to-import'),
    ])
    await flushAsyncState()
    expect(rendered.container.textContent).toContain('questionPackageKeyConflict')
    expect(importButton(rendered.container).disabled).toBe(true)

    firstRefresh.resolve([
      createQuestion('outdated-question'),
    ])
    await flushAsyncState()
    expect(rendered.container.textContent).toContain('questionPackageKeyConflict')
    expect(importButton(rendered.container).disabled).toBe(true)

    rendered.app.unmount()
  })
})

function importButton(container: HTMLElement) {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    .filter(button => button.textContent === 'importQuestions')
  const button = buttons.at(-1)
  if (!button) throw new Error('Import button missing')
  return button
}

async function prepareImport(value: unknown, instanceSha: string | null = commitSha) {
  const fetchRequest = vi.fn(async (path: string) => path === '/api/admin/build-info'
    ? { commitSha: instanceSha }
    : path === '/api/questions' ? [] : { createdCount: 1, updatedCount: 0 })
  vi.stubGlobal('$fetch', fetchRequest)
  const rendered = renderPage()
  findButton(rendered.container, 'importQuestions').click()
  await nextTick()
  await selectQuestionPackage(rendered.container, value)
  return { ...rendered, fetchRequest }
}

describe('admin import commit confirmation', () => {
  it.each([
    undefined,
    commitSha,
  ])('imports an absent or matching SHA without a warning: %s', async (sha) => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const rendered = await prepareImport({ ...questionPackage, commitSha: sha })
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(confirm).not.toHaveBeenCalled()
    expect(rendered.fetchRequest).toHaveBeenCalledWith('/api/questions/import', expect.objectContaining({
      query: undefined,
    }))
    rendered.app.unmount()
  })

  it('cancels without sending an import, then sends confirmation only after acceptance', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const rendered = await prepareImport({ ...questionPackage, commitSha: otherSha })
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(`"packageSha":"${otherSha}"`))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining(`"instanceSha":"${commitSha}"`))
    expect(rendered.fetchRequest.mock.calls.map(([
      path,
    ]) => path)).not.toContain('/api/questions/import')
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(rendered.fetchRequest).toHaveBeenCalledWith('/api/questions/import', expect.objectContaining({
      query: { confirmedCommitSha: commitSha },
    }))
    rendered.app.unmount()
  })

  it('requires confirmation even without a package SHA when the instance SHA is unknown', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    const rendered = await prepareImport(questionPackage, null)
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('confirmQuestionPackageCommitUnknown'))
    expect(rendered.fetchRequest.mock.calls.map(([
      path,
    ]) => path)).not.toContain('/api/questions/import')
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(rendered.fetchRequest).toHaveBeenCalledWith('/api/questions/import', expect.objectContaining({
      query: { confirmedCommitSha: 'unknown' },
    }))
    rendered.app.unmount()
  })

  it('refreshes metadata after a deployment conflict and requires a new confirmation without retrying', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const rendered = await prepareImport({ ...questionPackage, commitSha: otherSha })
    let deployedSha = commitSha
    let importAttempts = 0
    rendered.fetchRequest.mockImplementation(async (path: string) => {
      if (path === '/api/admin/build-info') return { commitSha: deployedSha }
      if (path === '/api/questions/import') {
        importAttempts += 1
        if (importAttempts === 1) {
          deployedSha = 'ef'.repeat(20)
          throw { code: 'quiz.question_package_commit_confirmation_required' }
        }
        return { createdCount: 1, updatedCount: 0 }
      }
      return []
    })
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(importAttempts).toBe(1)
    expect(confirm).toHaveBeenCalledOnce()
    importButton(rendered.container).click()
    await flushAsyncState()
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(rendered.fetchRequest).toHaveBeenLastCalledWith('/api/questions/import', expect.objectContaining({
      query: { confirmedCommitSha: deployedSha },
    }))
    rendered.app.unmount()
  })

  it('does not retain approval across file selections or accept a wrong version', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const rendered = await prepareImport({ ...questionPackage, commitSha: otherSha })
    importButton(rendered.container).click()
    await selectQuestionPackage(rendered.container, { ...questionPackage, commitSha: 'ef'.repeat(20) })
    importButton(rendered.container).click()
    expect(confirm).toHaveBeenCalledTimes(2)
    await selectQuestionPackage(rendered.container, { ...questionPackage, version: 1 })
    expect(importButton(rendered.container).disabled).toBe(true)
    expect(rendered.fetchRequest.mock.calls.map(([
      path,
    ]) => path)).not.toContain('/api/questions/import')
    rendered.app.unmount()
  })
})
