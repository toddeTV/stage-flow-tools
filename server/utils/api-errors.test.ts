import { describe, expect, it, vi } from 'vite-plus/test'

import { LoginRequestSchema } from '../../shared/utils/validation'
import {
  createApiError,
  defineApiHandler,
  parseValidatedValue,
} from './api-errors'

describe('createApiError', () => {
  it('uses the stable code for H3 statusMessage and response data', () => {
    const error = createApiError(400, 'validation.required', [
      { code: 'validation.required', path: [
        'username',
      ] },
    ])

    expect(error.statusCode).toBe(400)
    expect(error.statusMessage).toBe('validation.required')
    expect(error.data).toEqual({
      code: 'validation.required',
      issues: [
        { code: 'validation.required', path: [
          'username',
        ] },
      ],
    })
  })

  it('includes typed field paths when schema parsing fails', () => {
    expect(() => parseValidatedValue({
      password: 'secret',
      username: ' ',
    }, LoginRequestSchema)).toThrowError(expect.objectContaining({
      data: {
        code: 'validation.invalid_request',
        issues: [
          { code: 'validation.required', path: [
            'username',
          ] },
        ],
      },
      statusMessage: 'validation.invalid_request',
    }))
  })

  it('wraps unexpected handler failures without exposing internal text', async () => {
    const logger = vi.fn()
    vi.stubGlobal('logger_error', logger)
    const handler = defineApiHandler(async () => {
      throw new Error('sensitive implementation detail')
    })

    await expect(handler({} as never)).rejects.toThrowError(expect.objectContaining({
      data: { code: 'server.internal_error' },
      statusCode: 500,
      statusMessage: 'server.internal_error',
    }))
    expect(logger).toHaveBeenCalledWith('Unhandled API error', expect.any(Error))
  })
})
