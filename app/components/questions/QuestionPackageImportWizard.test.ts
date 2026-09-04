// @vitest-environment jsdom
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
} from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import QuestionPackageImportWizard from './QuestionPackageImportWizard.vue'

const questionPackage = {
  format: 'stage-flow-tools.question-package' as const,
  version: 1 as const,
  questions: [
    {
      answer_options: [
        { text: { en: 'Yes' } },
        { text: { en: 'No' } },
      ],
      is_disabled: false,
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
  vi.stubGlobal('computed', <T>(getter: () => T) => ({ value: getter() }))
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useApiError', () => ({ getIssueMessage: (issue: { code: string }) => issue.code }))
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

async function selectPackage(container: HTMLElement) {
  const input = container.querySelector<HTMLInputElement>('#question-package-file')

  if (!input) {
    throw new Error('Question-package file input is missing')
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
  await Promise.resolve()
  await nextTick()
}

function renderWizard(isPreviewReady: boolean) {
  const container = document.createElement('div')
  const confirmedPackages: typeof questionPackage[] = []
  const app = createApp(QuestionPackageImportWizard, {
    isImporting: false,
    isPreparingPreview: false,
    isPreviewReady,
    questions: [],
    onConfirm: (selectedPackage: typeof questionPackage) => confirmedPackages.push(selectedPackage),
  })

  app.component('UiButton', UiButton)
  document.body.append(container)
  app.mount(container)

  return {
    app,
    confirmedPackages,
    container,
  }
}

describe('question package import wizard', () => {
  it('keeps import disabled when the current package has no successful preview', async () => {
    const rendered = renderWizard(false)

    await selectPackage(rendered.container)

    const importButton = rendered.container.querySelector<HTMLButtonElement>('button')
    expect(importButton?.disabled).toBe(true)
    importButton?.click()
    expect(rendered.confirmedPackages).toEqual([])
    rendered.app.unmount()
  })

  it('enables import after the current package has a successful preview', async () => {
    const rendered = renderWizard(true)

    await selectPackage(rendered.container)

    const importButton = rendered.container.querySelector<HTMLButtonElement>('button')
    expect(importButton?.disabled).toBe(false)
    importButton?.click()
    expect(rendered.confirmedPackages).toHaveLength(1)
    expect(rendered.confirmedPackages[0]).toMatchObject(questionPackage)
    rendered.app.unmount()
  })
})
