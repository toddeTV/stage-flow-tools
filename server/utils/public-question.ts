import type {
  LocalizedString,
  Question,
} from '~/types'

export type PublicQuestion = Omit<
  Question,
  'note' | 'key' | 'alreadyPublished' | 'answer_options' | 'is_disabled' | 'sortOrder'
> & {
  answer_options: { text: LocalizedString }[]
}

/** Removes question fields that are not safe to send to unauthenticated clients. */
export function serializePublicQuestion(question: Question): PublicQuestion {
  const {
    note,
    key,
    alreadyPublished,
    answer_options,
    is_disabled,
    sortOrder,
    ...publicQuestion
  } = question

  return {
    ...publicQuestion,
    answer_options: answer_options.map(({ text }) => ({ text })),
  }
}
