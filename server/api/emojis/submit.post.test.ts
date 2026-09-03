import { describe, expect, it, vi } from 'vite-plus/test'

const checkEmojiCooldown = vi.fn()
const enqueueEmoji = vi.fn()
const readValidatedRequestBody = vi.fn()
const updateEmojiTimestamp = vi.fn()

vi.mock('@paralleldrive/cuid2', () => ({
  createId: () => 'emoji-id',
}))

vi.stubGlobal('checkEmojiCooldown', checkEmojiCooldown)
vi.stubGlobal('defineApiHandler', <T>(handler: T) => handler)
vi.stubGlobal('enqueueEmoji', enqueueEmoji)
vi.stubGlobal('readValidatedRequestBody', readValidatedRequestBody)
vi.stubGlobal('updateEmojiTimestamp', updateEmojiTimestamp)

const { default: submitEmoji } = await import('./submit.post')

describe('POST /api/emojis/submit', () => {
  it('records cooldown and returns success when a full queue discards an emoji', async () => {
    checkEmojiCooldown.mockReturnValue(false)
    enqueueEmoji.mockReturnValue(false)
    readValidatedRequestBody.mockResolvedValue({
      emoji: '🔥',
      user_id: 'participant-id',
    })

    await expect(submitEmoji({} as never)).resolves.toEqual({
      statusCode: 200,
      body: { message: 'Emoji received.' },
    })
    expect(updateEmojiTimestamp).toHaveBeenCalledWith('participant-id')
    expect(enqueueEmoji).toHaveBeenCalledWith({ emoji: '🔥', id: 'emoji-id' })
  })
})
