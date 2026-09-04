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
import QuestionPackageImportWizard from '~/components/questions/QuestionPackageImportWizard.vue'
import type {
  Question,
  QuestionPackage,
} from '~/types'

const questionPackage = {
  format: 'stage-flow-tools.question-package',
  version: 1,
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
  await Promise.resolve()
  await nextTick()
}

async function selectQuestionPackage(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('#question-package-file')

  if (!input) {
    throw new Error('Question package input is missing')
  }

  Object.defineProperty(input, 'files', {
    configurable: true,
    value: [
      {
        text: async () => JSON.stringify(questionPackage),
      },
    ],
  })
  input.dispatchEvent(new Event('change'))
  await flushAsyncState()
}

function renderPage() {
  const container = document.createElement('div')
  const app = createApp(QuestionsPage)

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
    getErrorCode: () => undefined,
    getErrorMessage: () => 'Request failed',
    getIssueMessage: () => 'Invalid value',
  }))
  vi.stubGlobal('useFetch', () => ({
    data: ref<Question[]>([]),
    error: ref(),
    refresh: vi.fn(),
  }))
  vi.stubGlobal('useI18n', () => ({
    t: (key: string, values?: { count?: number }) => values?.count === undefined ? key : `${key}:${values.count}`,
  }))
  vi.stubGlobal('useLocalization', () => ({ getLocalizedText: (value: { en: string }) => value.en }))
  vi.stubGlobal('watch', watch)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('admin question package import preview', () => {
  it('keeps the newest question snapshot when an older refresh resolves last', async () => {
    const firstRefresh = createDeferred<Question[]>()
    const secondRefresh = createDeferred<Question[]>()
    const fetchQuestions = vi.fn()
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise)
    vi.stubGlobal('$fetch', fetchQuestions)

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
    expect(rendered.container.textContent).toContain('questionsToUpdate:1')

    firstRefresh.resolve([
      createQuestion('outdated-question'),
    ])
    await flushAsyncState()
    expect(rendered.container.textContent).toContain('questionsToUpdate:1')

    rendered.app.unmount()
  })
})
