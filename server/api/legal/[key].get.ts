import { getRouterParam } from 'h3'
import {
  getLegalDocument,
  isLegalDocumentKey,
} from '../../utils/legal-documents'

export default defineEventHandler((event) => {
  const key = getRouterParam(event, 'key')

  if (!isLegalDocumentKey(key)) {
    return null
  }

  return getLegalDocument(key) ?? null
})
