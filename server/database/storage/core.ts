import {
  getLocalDatabaseClient,
} from '../local-sqlite'

let storageInitialized = false

export function getDatabase() {
  return getLocalDatabaseClient().db
}

/** Initializes SQLite access once after the startup migration plugin has run. */
export async function initStorage() {
  if (storageInitialized) return

  try {
    getDatabase()
    storageInitialized = true
  }
  catch (error: unknown) {
    logger_error('SQLite initialization error:', error)
    throw error
  }
}
