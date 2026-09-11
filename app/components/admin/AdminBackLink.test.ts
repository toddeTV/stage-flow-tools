// @vitest-environment jsdom
import {
  createApp,
  defineComponent,
  h,
} from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test'
import AdminBackLink from './AdminBackLink.vue'

const NuxtLink = defineComponent({
  props: {
    to: {
      required: true,
      type: String,
    },
  },
  setup(props, { attrs, slots }) {
    return () => h('a', { ...attrs, href: props.to }, slots.default?.())
  },
})

function renderLink() {
  const container = document.createElement('div')
  const app = createApp(AdminBackLink)

  app.component('NuxtLink', NuxtLink)
  document.body.append(container)
  app.mount(container)

  return { app, container }
}

beforeEach(() => {
  vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
})

afterEach(() => {
  document.body.replaceChildren()
  vi.unstubAllGlobals()
})

describe('admin back link', () => {
  it('links to the admin overview and accepts keyboard focus', () => {
    const rendered = renderLink()
    const link = rendered.container.querySelector<HTMLAnchorElement>('a')

    expect(link?.getAttribute('href')).toBe('/admin')

    link?.focus()
    expect(document.activeElement).toBe(link)

    rendered.app.unmount()
  })
})
