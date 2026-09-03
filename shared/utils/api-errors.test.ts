import { describe, expect, it } from 'vite-plus/test'

import { isApiErrorCode } from './api-errors'

describe('isApiErrorCode', () => {
  it('accepts declared stable API error codes only', () => {
    expect(isApiErrorCode('validation.required')).toBe(true)
    expect(isApiErrorCode('quiz.question_not_found')).toBe(true)
    expect(isApiErrorCode('Question not found')).toBe(false)
    expect(isApiErrorCode('unknown.code')).toBe(false)
  })
})
