import type { ApiErrorCode, ApiErrorIssue } from '../../shared/utils/api-errors'
import { isApiErrorCode } from '../../shared/utils/api-errors'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorData(error: unknown): Record<string, unknown> | undefined {
  if (!isRecord(error) || !isRecord(error.data)) {
    return undefined
  }

  return error.data
}

function getCodeFromData(data: Record<string, unknown>): ApiErrorCode | undefined {
  if (isApiErrorCode(data.code)) {
    return data.code
  }

  if (isRecord(data.data) && isApiErrorCode(data.data.code)) {
    return data.data.code
  }

  if (isApiErrorCode(data.statusMessage)) {
    return data.statusMessage
  }

  return undefined
}

export function useApiError() {
  const { t } = useI18n({ useScope: 'global' })

  function getErrorCode(error: unknown, fallback: ApiErrorCode = 'server.internal_error'): ApiErrorCode {
    const data = getErrorData(error)

    return data ? getCodeFromData(data) ?? fallback : fallback
  }

  function getErrorMessage(error: unknown, fallback?: ApiErrorCode): string {
    return t(`errors.${getErrorCode(error, fallback)}`)
  }

  function getIssueMessage(issue: ApiErrorIssue): string {
    return t(`errors.${issue.code}`)
  }

  function getErrorIssues(error: unknown): ApiErrorIssue[] {
    const data = getErrorData(error)
    const nestedData = data && isRecord(data.data) ? data.data : data
    const issues = nestedData?.issues

    if (!Array.isArray(issues)) {
      return []
    }

    return issues.filter((issue): issue is ApiErrorIssue => (
      isRecord(issue)
      && isApiErrorCode(issue.code)
      && Array.isArray(issue.path)
    ))
  }

  return {
    getErrorCode,
    getErrorIssues,
    getErrorMessage,
    getIssueMessage,
  }
}
