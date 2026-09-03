import { describe, expect, it, vi } from 'vite-plus/test'

const t = vi.fn((key: string) => key)

vi.stubGlobal('useI18n', () => ({ t }))

const { useApiError } = await import('./useApiError')

describe('useApiError', () => {
  it('maps nested H3 error codes to global translation keys', () => {
    const { getErrorMessage, getErrorIssues } = useApiError()
    const error = {
      data: {
        data: {
          code: 'validation.invalid_request',
          issues: [
            { code: 'validation.required', path: [
              'username',
            ] },
          ],
        },
      },
    }

    expect(getErrorMessage(error)).toBe('errors.validation.invalid_request')
    expect(getErrorIssues(error)).toEqual([
      { code: 'validation.required', path: [
        'username',
      ] },
    ])
  })
})
