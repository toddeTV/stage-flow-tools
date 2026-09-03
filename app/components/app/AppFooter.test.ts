import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  describe,
  expect,
  it,
} from 'vite-plus/test'

const footerSource = readFileSync(fileURLToPath(new URL('./AppFooter.vue', import.meta.url)), 'utf8')

describe('app footer', () => {
  it('renders the todde.tv credit with a decorative heart', () => {
    expect(footerSource).toContain('Created with')
    expect(footerSource).toContain('fill-red-600')
    expect(footerSource).toContain('aria-hidden="true"')
    expect(footerSource).toContain('Website of todde.tv')
    expect(footerSource).toContain('todde.tv')
    expect(footerSource).not.toContain('Website of Thorsten Seyschab')
  })

  it('links both public legal documents', () => {
    expect(footerSource).toContain('to="/legal-notice"')
    expect(footerSource).toContain('to="/privacy-policy"')
    expect(footerSource.indexOf('Legal Notice')).toBeLessThan(footerSource.indexOf('Privacy Policy'))
  })
})
