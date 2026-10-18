import { describe, expect, it } from 'vite-plus/test'
import { validateAuthConfig } from './auth-config'

const validConfig = {
  adminPassword: 'test-only-admin-password',
  jwtSecret: 'test-only-jwt-secret-with-explicit-configuration',
}

describe('validateAuthConfig', () => {
  it('accepts explicit credentials without changing their whitespace', () => {
    const config = Object.freeze({
      adminPassword: ` ${validConfig.adminPassword} `,
      jwtSecret: ` ${validConfig.jwtSecret} `,
    })

    expect(() => validateAuthConfig(config)).not.toThrow()
    expect(config.adminPassword).toBe(` ${validConfig.adminPassword} `)
    expect(config.jwtSecret).toBe(` ${validConfig.jwtSecret} `)
  })

  it.each([
    [
      'adminPassword',
      'NUXT_ADMIN_PASSWORD',
      '123',
    ],
    [
      'jwtSecret',
      'NUXT_JWT_SECRET',
      'tryUJ0zQbstPbTOrezme+Fv+KndzDNRx5lmSeelr2ial2/2yV8HqLeQ2felJafqf',
    ],
  ] as const)('rejects missing, malformed, and published default %s values', (key, envKey, previousDefault) => {
    for (const value of [
      undefined,
      null,
      false,
      123,
      {},
      [],
      '',
      ' \t\n ',
      previousDefault,
      ` \t${previousDefault}\n `,
    ]) {
      const config = { ...validConfig, [key]: value }

      expect(() => validateAuthConfig(config)).toThrowError(
        `Invalid runtime config ${envKey}: expected a non-empty, non-default value.`,
      )
    }
  })

  it.each([
    'adminPassword',
    'jwtSecret',
  ] as const)('does not let a static token replace %s', (key) => {
    const config = { ...validConfig, adminToken: 'test-only-static-token', [key]: '' }

    expect(() => validateAuthConfig(config)).toThrowError('Invalid runtime config')
  })
})
