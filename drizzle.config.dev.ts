import { defineConfig } from 'drizzle-kit'
import { localDatabasePath } from './server/database/local-config'

/**
 * Drizzle config for local development against `better-sqlite3`.
 */
export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: localDatabasePath,
  },
})
