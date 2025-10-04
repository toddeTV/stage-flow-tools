export interface Question {
  id: string
  question_text: string
  answer_options: string[]
  is_locked: boolean
}

export interface Results {
  question: Question
  results: Record<string, number>
  totalVotes: number
}