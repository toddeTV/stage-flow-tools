// @vitest-environment happy-dom
import {
  computed,
  defineComponent,
  h,
  ref,
} from 'vue'
import {
  flushPromises,
  mount,
} from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import type { Question } from '~/types'
import QuestionPackageImportWizard from './QuestionPackageImportWizard.vue'

const questionPackage = {
  format: 'stage-flow-tools.question-package' as const,
  version: 1,
  questions: [
    {
      answer_options: [
        { text: { en: 'Yes' } },
        { text: { en: 'No' } },
      ],
      is_disabled: false,
      key: 'existing-question',
      question_text: { en: 'Question' },
    },
  ],
}

const UiButton = defineComponent({
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('button', attrs, slots.default?.())
  },
})

beforeEach(() => {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useApiError', () => ({ getIssueMessage: (issue: { code: string }) => issue.code }))
  vi.stubGlobal('useI18n', () => ({
    t: (key: string, params?: { count?: number }) => params?.count === undefined
      ? key
      : `${key}:${params.count}`,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderWizard(isPreviewReady: boolean, questions: Question[] = []) {
  return mount(QuestionPackageImportWizard, {
    props: {
      isImporting: false,
      isPreparingPreview: false,
      isPreviewReady,
      questions,
    },
    global: {
      components: { UiButton },
    },
  })
}

async function selectPackage(wrapper: ReturnType<typeof renderWizard>) {
  const input = wrapper.get<HTMLInputElement>('#question-package-file')

  Object.defineProperty(input.element, 'files', {
    configurable: true,
    value: [
      {
        text: async () => JSON.stringify(questionPackage),
      },
    ],
  })
  await input.trigger('change')
  await flushPromises()
}

function importButton(wrapper: ReturnType<typeof renderWizard>) {
  const button = wrapper.findAll('button')[0]

  if (!button) {
    throw new Error('Import button is missing')
  }

  return button
}

describe('question package import wizard', () => {
  it('emits the selected package but keeps import disabled without a successful preview', async () => {
    const wrapper = renderWizard(false)

    await selectPackage(wrapper)

    expect(wrapper.emitted('packageSelected')).toEqual([
      [
        questionPackage,
      ],
    ])
    expect((importButton(wrapper).element as HTMLButtonElement).disabled).toBe(true)
  })

  it('enables import after a successful preview and emits the confirmed package', async () => {
    const wrapper = renderWizard(true)

    await selectPackage(wrapper)

    const button = importButton(wrapper)
    expect((button.element as HTMLButtonElement).disabled).toBe(false)
    await button.trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([
      [
        questionPackage,
      ],
    ])
  })

  it('shows the update warning when the selected package changes an existing question', async () => {
    const wrapper = renderWizard(true, [
      {
        answer_options: [
          { text: { en: 'Old yes' } },
          { text: { en: 'Old no' } },
        ],
        alreadyPublished: true,
        createdAt: '2026-09-04T12:00:00.000Z',
        id: 'existing-question-id',
        is_active: true,
        is_disabled: false,
        is_locked: true,
        key: 'existing-question',
        question_text: { en: 'Old question' },
        sortOrder: 4,
      },
    ])

    await selectPackage(wrapper)

    expect(wrapper.text()).toContain('questionsToUpdate:1')
    expect(wrapper.text()).toContain('questionPackageAnswerWarning')
  })
})
