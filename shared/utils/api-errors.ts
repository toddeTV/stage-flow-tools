export const API_ERROR_CODES = [
  'validation.invalid_request',
  'validation.invalid_json',
  'validation.required',
  'validation.invalid_type',
  'validation.invalid_emoji',
  'validation.minimum_answer_options',
  'validation.duplicate_answer_option',
  'validation.invalid_websocket_query',
  'validation.invalid_websocket_message',
  'auth.credentials_required',
  'auth.credentials_invalid',
  'auth.token_required',
  'auth.token_invalid',
  'quiz.no_active_question',
  'quiz.question_locked',
  'quiz.invalid_answer',
  'quiz.question_not_found',
  'quiz.question_key_conflict',
  'quiz.question_active',
  'quiz.question_published',
  'quiz.no_unpublished_question',
  'quiz.publish_next_failed',
  'emoji.cooldown',
  'answer.no_answers_for_question',
  'answer.no_users_for_option',
  'websocket.winner_not_connected',
  'studio.asset_not_found',
  'studio.asset_path_invalid',
  'studio.proxy_timeout',
  'studio.proxy_unavailable',
  'studio.shell_timeout',
  'studio.shell_unavailable',
  'studio.shell_load_failed',
  'studio.asset_timeout',
  'studio.asset_unavailable',
  'studio.asset_load_failed',
  'studio.invalid_internal_port',
  'studio.start_failed',
  'route.not_found',
  'server.internal_error',
] as const

export type ApiErrorCode = typeof API_ERROR_CODES[number]

export type ApiErrorIssue = {
  code: ApiErrorCode
  path: Array<number | string>
}

export type ApiErrorData = {
  code: ApiErrorCode
  issues?: ApiErrorIssue[]
}

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && API_ERROR_CODES.includes(value as ApiErrorCode)
}
