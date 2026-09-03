import { eq } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import {
  legalDocumentKeys,
  legalDocuments,
} from '../database/schema'
import type {
  LegalDocumentKey,
  LegalDocumentRow,
} from '../database/schema'
import { getLocalDatabaseClient } from '../database/local-sqlite'
import type * as schema from '../database/schema'

export { legalDocumentKeys }
export type { LegalDocumentKey }

type LegalDatabase = BetterSQLite3Database<typeof schema>

export function isLegalDocumentKey(value: string | undefined): value is LegalDocumentKey {
  return legalDocumentKeys.some(key => key === value)
}

/** Returns one public legal document without providing any write capability. */
export function getLegalDocument(
  key: LegalDocumentKey,
  database: LegalDatabase = getLocalDatabaseClient().db,
): LegalDocumentRow | undefined {
  return database
    .select()
    .from(legalDocuments)
    .where(eq(legalDocuments.key, key))
    .get()
}
