export type LocalizedString = {
  en: string
} & Record<string, string>

export interface AnswerOption {
  text: LocalizedString
  emoji?: string
}

export interface Question {
  id: string
  key: string
  question_text: LocalizedString
  answer_options: AnswerOption[]
  is_active?: boolean
  is_locked: boolean
  createdAt: string
  alreadyPublished: boolean
  note?: LocalizedString
}


export type InputQuestion = Omit<Question, 'id' | 'is_active' | 'is_locked' | 'createdAt' | 'alreadyPublished'>

export interface Answer {
  id: string
  question_id: string
  user_id: string
  user_nickname: string
  selected_answer: LocalizedString
  timestamp: string
}

export interface Results {
  question: Question
  results: Record<string, { count: number, emoji?: string }>
  totalVotes: number
  totalConnections: number
}

export enum WebSocketChannel {
  DEFAULT = 'default',
  RESULTS = 'results',
  EMOJIS = 'emojis',
}