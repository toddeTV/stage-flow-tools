type AuthRuntimeConfig = {
  adminPassword: unknown
  jwtSecret: unknown
}

function requireAuthSecret(value: unknown, key: string, previousDefault: string): void {
  if (typeof value !== 'string' || !value.trim() || value.trim() === previousDefault) {
    throw new Error(`Invalid runtime config ${key}: expected a non-empty, non-default value.`)
  }
}

/** Requires explicit admin credentials before the server accepts requests in any mode. */
export function validateAuthConfig(config: AuthRuntimeConfig): void {
  requireAuthSecret(config.adminPassword, 'NUXT_ADMIN_PASSWORD', '123')
  requireAuthSecret(
    config.jwtSecret,
    'NUXT_JWT_SECRET',
    'tryUJ0zQbstPbTOrezme+Fv+KndzDNRx5lmSeelr2ial2/2yV8HqLeQ2felJafqf',
  )
}
