import {
  createError,
  defineEventHandler,
  readBody,
} from 'h3'
import type { H3Event } from 'h3'
import * as v from 'valibot'
import type {
  ApiErrorCode,
  ApiErrorData,
  ApiErrorIssue,
} from '../../shared/utils/api-errors'
import { isApiErrorCode } from '../../shared/utils/api-errors'
import { getValidationIssues } from '../../shared/utils/validation'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCodeError(error: unknown): boolean {
  return isRecord(error)
    && isRecord(error.data)
    && isApiErrorCode(error.data.code)
}

export function createApiError(
  statusCode: number,
  code: ApiErrorCode,
  issues?: ApiErrorIssue[],
) {
  const data: ApiErrorData = {
    code,
    ...(issues && issues.length > 0 ? { issues } : {}),
  }

  return createError({
    data,
    statusCode,
    statusMessage: code,
  })
}

export function throwApiError(
  statusCode: number,
  code: ApiErrorCode,
  issues?: ApiErrorIssue[],
): never {
  throw createApiError(statusCode, code, issues)
}

export async function readValidatedRequestBody<TOutput>(
  event: H3Event,
  schema: v.GenericSchema,
): Promise<TOutput> {
  let body: unknown

  try {
    body = await readBody(event)
  }
  catch {
    throwApiError(400, 'validation.invalid_request')
  }

  return parseValidatedValue<TOutput>(body, schema)
}

export function parseValidatedValue<TOutput>(
  value: unknown,
  schema: v.GenericSchema,
  code: ApiErrorCode = 'validation.invalid_request',
): TOutput {
  const result = v.safeParse(schema, value)

  if (!result.success) {
    throwApiError(400, code, getValidationIssues(result.issues))
  }

  return result.output as TOutput
}

export function defineApiHandler<T>(handler: (event: H3Event) => Promise<T> | T) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    }
    catch (error: unknown) {
      if (isCodeError(error)) {
        throw error
      }

      logger_error('Unhandled API error', error)
      throwApiError(500, 'server.internal_error')
    }
  })
}
