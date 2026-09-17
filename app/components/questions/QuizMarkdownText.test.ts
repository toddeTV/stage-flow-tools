// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import QuizMarkdownText from './QuizMarkdownText.vue'

describe('QuizMarkdownText', () => {
  it('contains block code without widening its parent', () => {
    const wrapper = mount(QuizMarkdownText, {
      props: {
        text: '```\nconst veryLongValue = 123\n```',
      },
    })
    const codeBlock = wrapper.get('.quiz-markdown-code-block')

    expect(wrapper.get('.quiz-markdown-text').classes()).toContain('quiz-markdown-text--block')
    expect(codeBlock.attributes('tabindex')).toBe('0')
    expect(codeBlock.text()).toContain('const veryLongValue = 123')
  })

  it('renders fenced code inline when requested', () => {
    const wrapper = mount(QuizMarkdownText, {
      props: {
        mode: 'inline',
        text: '```\nfirst line\nsecond line\n```',
      },
    })

    expect(wrapper.get('.quiz-markdown-text').classes()).toContain('quiz-markdown-text--inline')
    expect(wrapper.find('.quiz-markdown-code-block').exists()).toBe(false)
    expect(wrapper.get('code').text()).toBe('first line second line')
  })
})
