import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import {
  getLocalDatabasePath,
  getLocalMigrationsFolder,
} from './local-config'
import * as schema from './schema'

declare global {
  var __stageFlowToolsLocalDatabaseClient:
    | ReturnType<typeof createLocalDatabaseClient>
    | undefined
}

/**
 * Returns the default local SQLite path used by Drizzle in development.
 */
export { getLocalDatabasePath, getLocalMigrationsFolder }

/**
 * Creates a local SQLite connection plus typed Drizzle client for one file path.
 */
export function createLocalDatabaseClient(databasePath = getLocalDatabasePath()) {
  mkdirSync(dirname(databasePath), { recursive: true })

  const sqlite = new Database(databasePath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  const db = drizzle(sqlite, { schema })

  return {
    db,
    sqlite,
  }
}

/**
 * Returns the shared SQLite connection used by the running server process.
 */
export function getLocalDatabaseClient() {
  globalThis.__stageFlowToolsLocalDatabaseClient ??= createLocalDatabaseClient()

  return globalThis.__stageFlowToolsLocalDatabaseClient
}

/**
 * Applies pending SQL migrations to a typed local SQLite Drizzle client.
 */
export function applyLocalMigrations(
  db: BetterSQLite3Database<typeof schema>,
  migrationsFolder = getLocalMigrationsFolder(),
) {
  migrate(db, { migrationsFolder })
}
