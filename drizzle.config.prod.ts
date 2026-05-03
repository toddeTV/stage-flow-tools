import { defineConfig } from 'drizzle-kit'
import { localDatabasePath } from './server/database/local-config'

/**
 * Production currently runs on local SQLite inside the Docker or Node runtime.
 *
 * Keep this config aligned with the shipped file path until a real D1 runtime
 * target is introduced in a follow-up change.
 */
export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: localDatabasePath,
  },
})
