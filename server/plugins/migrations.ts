import {
  applyLocalMigrations,
  getLocalDatabaseClient,
} from '../database/local-sqlite'

/** Applies pending SQLite migrations when the Nitro server starts. */
export default defineNitroPlugin(() => {
  try {
    applyLocalMigrations(getLocalDatabaseClient().db)
  }
  catch (error: unknown) {
    logger_error('SQLite migration startup error:', error)
    throw error
  }
})
