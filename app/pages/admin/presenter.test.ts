// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import type { Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { PresenterCurrentState, Question } from '~/types'
import type { PresenterErrorKind } from '~/composables/usePresenterQuiz'
import type { PresenterQuizStep } from '~/utils/presenter-quiz-state'
import PresenterPage from './presenter.vue'

const route = reactive({ query: {} as Record<string, unknown> })
const navigate = vi.fn()
const pollingIntervalInputs: Array<Readonly<Ref<number>>> = []
const question: Question = {
  alreadyPublished: true,
  answer_options: [],
  createdAt: '',
  id: 'one',
  is_disabled: false,
  is_locked: false,
  key: 'one',
  question_text: { en: 'Question' },
  sortOrder: 0,
}
const emptyState: PresenterCurrentState = {
  currentQuestion: null,
  hasActiveQuestion: false,
  receivedAnswers: 0,
  receivedAnswersPercent: 0,
  totalUsers: 0,
}
const controller = {
  currentQuestion: ref<Question | null>(question),
  currentState: ref<PresenterCurrentState | null>(emptyState),
  errorKind: ref<PresenterErrorKind | null>(null),
  isInitialized: ref(true),
  isLoading: ref(false),
  isTransitioning: ref(false),
  navigate,
  questions: ref([
    question,
  ]),
  step: ref<PresenterQuizStep>({ kind: 'question', phase: 'open', questionIndex: 0 }),
}

vi.mock('~/composables/usePresenterQuiz', () => ({
  usePresenterQuiz: (pollIntervalSeconds: Readonly<Ref<number>>) => {
    pollingIntervalInputs.push(pollIntervalSeconds)
    return controller
  },
}))

const Icon = defineComponent({
  props: { name: { required: true, type: String } },
  setup: props => () => h('svg', { 'data-icon': props.name }),
})
const PresenterQuizView = defineComponent({
  emits: [
    'navigate',
  ],
  setup: (_props, { emit }) => () => h('button', {
    class: 'quiz-stub',
    onClick: () => emit('navigate', 'next'),
  }, 'quiz'),
})

function render() {
  return mount(PresenterPage, {
    global: { components: { Icon, PresenterQuizView } },
  })
}

beforeEach(() => {
  const happyWindow = window as unknown as {
    happyDOM: { settings: { disableIframePageLoading: boolean, handleDisabledFileLoadingAsSuccess: boolean } }
  }
  happyWindow.happyDOM.settings.disableIframePageLoading = true
  happyWindow.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true
  vi.spyOn(console, 'error').mockImplementation(() => {})
  route.query = {}
  navigate.mockReset()
  pollingIntervalInputs.length = 0
  controller.step.value = { kind: 'question', phase: 'open', questionIndex: 0 }
  controller.isTransitioning.value = false
  controller.errorKind.value = null
  vi.stubGlobal('definePageMeta', vi.fn())
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  vi.stubGlobal('useRoute', () => route)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('presenter page', () => {
  it('scales a reactive virtual stage without changing the iframe URLs', async () => {
    route.query = { stageScale: '0.75' }
    const wrapper = render()
    const viewport = wrapper.get('.presenter-viewport')
    const stage = wrapper.get('.presenter-stage')

    expect(viewport.attributes('data-color-mode')).toBe('light')
    expect((viewport.element as HTMLElement).style.getPropertyValue('--presenter-stage-scale')).toBe('0.75')
    expect((stage.element as HTMLElement).style.width).toBe(`${100 / 0.75}%`)
    expect((stage.element as HTMLElement).style.height).toBe(`${100 / 0.75}%`)
    expect((stage.element as HTMLElement).style.transform).toBe('scale(0.75)')
    expect((stage.element as HTMLElement).style.transformOrigin).toBe('top left')
    expect(wrapper.get('.emoji-layer iframe').attributes('src')).not.toContain('stageScale')

    route.query = { stageScale: '2' }
    await nextTick()
    expect((stage.element as HTMLElement).style.width).toBe('50%')
    expect((stage.element as HTMLElement).style.height).toBe('50%')
    expect((stage.element as HTMLElement).style.transform).toBe('scale(2)')
    wrapper.unmount()
  })

  it('uses one background parameter in light and dark mode without forwarding it', async () => {
    route.query = { background: '#123456' }
    const wrapper = render()
    const viewport = wrapper.get('.presenter-viewport')

    expect(viewport.attributes('data-color-mode')).toBe('light')
    expect((viewport.element as HTMLElement).style.backgroundColor).toBe('#123456')
    expect(wrapper.get('.emoji-layer iframe').attributes('src')).not.toContain('%23123456')

    route.query = { background: '#abcdef', colorMode: 'dark' }
    await nextTick()
    expect(viewport.attributes('data-color-mode')).toBe('dark')
    expect((viewport.element as HTMLElement).style.backgroundColor).toBe('#abcdef')
    expect(wrapper.get('.emoji-layer iframe').attributes('src')).not.toContain('%23abcdef')
    wrapper.unmount()
  })

  it('removes the emoji iframe when the layer is disabled', async () => {
    const wrapper = render()
    expect(wrapper.find('.emoji-layer').exists()).toBe(true)

    route.query = { emojiLayer: 'none' }
    await nextTick()

    expect(wrapper.find('.emoji-layer').exists()).toBe(false)
    expect(wrapper.findAll('iframe')).toHaveLength(0)
    wrapper.unmount()
  })

  it('passes reactive presenter polling seconds to the controller', async () => {
    route.query = { presenterRefresh: '0.5' }
    const wrapper = render()

    expect(pollingIntervalInputs).toHaveLength(1)
    expect(pollingIntervalInputs[0]?.value).toBe(0.5)

    route.query = { presenterRefresh: '1.25' }
    await nextTick()
    expect(pollingIntervalInputs[0]?.value).toBe(1.25)
    wrapper.unmount()
  })

  it('builds click-through emoji and terminal frames from prefixed parameters', async () => {
    route.query = {
      colorMode: 'dark',
      emojiBackground: '#112233',
      emojiLayer: 'foreground',
      leaderboardCore: 'true',
      leaderboardPadding: '8',
      recapCount: '2',
      recapPadding: '6',
      stageScale: '0.7',
    }
    controller.step.value = { kind: 'leaderboard' }
    const wrapper = render()
    await nextTick()

    const emojiLayer = wrapper.get('.emoji-layer')
    const frames = wrapper.findAll('iframe')
    expect(wrapper.get('.presenter-viewport').attributes('data-color-mode')).toBe('dark')
    expect(emojiLayer.classes()).toContain('is-foreground')
    expect(emojiLayer.get('iframe').attributes('tabindex')).toBe('-1')
    expect((emojiLayer.element as HTMLElement).style.pointerEvents).toBe('none')
    expect((emojiLayer.get('iframe').element as HTMLElement).style.pointerEvents).toBe('none')
    expect(frames[0]?.attributes('src')).toContain('/admin/emojis?scale=0.3&transparency=0.8')
    expect(frames[0]?.attributes('src')).toContain('background=%23112233')
    expect(frames[1]?.attributes('src')).toContain('/admin/leaderboard?colorMode=dark&padding=8')
    expect(frames[1]?.attributes('src')).toContain('core=')
    expect(frames[1]?.attributes('src')).toContain('showUserId=false')
    expect(frames.every(frame => !frame.attributes('src')?.includes('stageScale'))).toBe(true)
    expect(frames.every(frame => !frame.attributes('src')?.includes('token'))).toBe(true)
    wrapper.unmount()
  })

  it('reuses terminal controls for the recap iframe and forwards only its safe parameters', async () => {
    route.query = {
      colorMode: 'dark',
      language: 'de-DE',
      recapCore: 'true',
      recapCount: '2',
      recapPadding: '6',
      recapRefresh: '10',
      recapScale: '1.2',
      stageScale: '0.7',
      presenterRefresh: '0.5',
      token: 'secret',
    }
    controller.step.value = { kind: 'recap' }
    const wrapper = render()
    await nextTick()

    const frame = wrapper.get('.endscreen-frame')
    const navigation = wrapper.get('.endscreen-navigation')
    expect(frame.attributes('src')).toBe(
      '/admin/recap?colorMode=dark&count=2&padding=6&refresh=10&scale=1.2&core=&language=de-DE',
    )
    expect(frame.attributes('title')).toBe('recap')
    expect(navigation.text()).toContain('recap')
    expect(frame.attributes('src')).not.toContain('stageScale')
    expect(frame.attributes('src')).not.toContain('presenterRefresh')
    expect(frame.attributes('src')).not.toContain('secret')
    wrapper.unmount()
  })

  it('routes arrows through one action and ignores repeats and editable targets', async () => {
    const wrapper = render()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', repeat: true }))

    const input = document.createElement('input')
    document.body.append(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }))
    await nextTick()

    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('next')
    wrapper.unmount()
  })

  it('keeps content visible and reports refresh errors through aria-live', async () => {
    controller.errorKind.value = 'refresh'
    const wrapper = render()

    expect(wrapper.find('.quiz-stub').exists()).toBe(true)
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('refreshError')
    wrapper.unmount()
  })

  it('routes mouse controls and focused terminal iframe arrows to the same controller', async () => {
    controller.step.value = { kind: 'recap' }
    const wrapper = render()
    await nextTick()

    const buttons = wrapper.findAll('.endscreen-navigation button')
    await buttons[0]?.trigger('click')
    await buttons[1]?.trigger('click')
    const frame = wrapper.get('.endscreen-frame').element as HTMLIFrameElement
    const childWindow = new EventTarget()
    Object.defineProperty(frame, 'contentWindow', {
      configurable: true,
      value: childWindow,
    })
    await wrapper.get('.endscreen-frame').trigger('load')
    childWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))

    expect(navigate.mock.calls).toEqual([
      [
        'previous',
      ],
      [
        'next',
      ],
      [
        'previous',
      ],
    ])
    wrapper.unmount()
  })
})
