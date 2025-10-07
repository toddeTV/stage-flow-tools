export interface Question {
  id: string
  question_text: string
  answer_options: string[]
  is_locked: boolean
}

export type InputQuestion = Omit<Question, 'id' | 'is_locked'>

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
  results: Record<string, number>
  totalVotes: number
}