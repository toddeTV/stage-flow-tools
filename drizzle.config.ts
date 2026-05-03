import { defineConfig } from 'drizzle-kit'
import { localDatabasePath } from './server/database/local-config'

/**
 * Default Drizzle config used for migration generation and local Studio access.
 *
 * Local SQLite is source of truth for generated SQL. Production reuses the same
 * schema and migration folder through `drizzle.config.prod.ts`.
 */
export default defineConfig({
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: localDatabasePath,
  },
})
