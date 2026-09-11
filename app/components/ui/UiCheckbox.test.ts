// @vitest-environment happy-dom
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import UiCheckbox from './UiCheckbox.vue'

beforeEach(() => {
  vi.stubGlobal('computed', computed)
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('UI checkbox', () => {
  it('uses a focusable native checkbox and emits its changed value', async () => {
    const wrapper = mount(UiCheckbox, {
      attachTo: document.body,
      props: { modelValue: false },
      slots: { default: 'Enable question' },
    })
    const input = wrapper.get<HTMLInputElement>('label > input[type="checkbox"]')

    expect(input.element.checked).toBe(false)
    input.element.focus()
    expect(document.activeElement).toBe(input.element)

    await input.setValue(true)
    expect(wrapper.emitted('update:modelValue')).toEqual([
      [
        true,
      ],
    ])
  })

  it('keeps disabled controls unavailable for native clicks', () => {
    const wrapper = mount(UiCheckbox, {
      attachTo: document.body,
      props: {
        disabled: true,
        modelValue: false,
      },
    })
    const input = wrapper.get<HTMLInputElement>('input[type="checkbox"]')

    expect(input.element.disabled).toBe(true)
    input.element.click()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
