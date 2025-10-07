export interface AnswerOption {
  text: string
  emoji?: string
}

export interface Question {
  id: string
  question_text: string
  answer_options: AnswerOption[]
  is_locked: boolean
  createdAt: string
  alreadyPublished: boolean
}

export type UserQuestion = Omit<Question, 'answer_options'> & {
  answer_options: string[]
}

export type InputQuestion = Omit<Question, 'id' | 'is_locked' | 'createdAt' | 'alreadyPublished'>

export interface Answer {
  id: string
  question_id: string
  user_id: string
  user_nickname: string
  selected_answer: string
  timestamp: string
}

export interface Results {
  question: Question
  results: Record<string, { count: number, emoji?: string }>
  totalVotes: number
  totalConnections: number
}