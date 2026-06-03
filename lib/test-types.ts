// Type definitions for test patterns
export interface ReadingQuestion {
  id: number
  type:
    | "true-false-not-given"
    | "multiple-choice"
    | "fill-in-blank"
    | "matching"
    | "multiple-select"
    | "summary-completion"
    | "matching-headings"
    | "matching-features"
    | "matching-sentence-endings"
    | "yes-no-not-given"
    | "diagram-label-completion"
    | "short-answer"
  question: string
  options?: string[]
  correctAnswer: string | number | string[] // Support multiple correct answers for multiple-select
  selectCount?: number // For multiple-select: how many options to select (e.g., 2 for "Choose TWO")
  summaryText?: string // For summary-completion: the paragraph with blanks
  blankIds?: number[] // For summary-completion: which question IDs are blanks in the summary
  // For matching types
  matchingItems?: string[] // Items to match
  matchingOptions?: string[] // Options to match to
  // For diagram labelling
  diagramUrl?: string
  labelOptions?: string[]
  // For yes/no/not given
  statementText?: string
}

export interface ReadingPart {
  partNumber: number
  title: string
  instruction: string
  passage: string
  questions: ReadingQuestion[]
  totalQuestions: number
}

export interface ReadingTest {
  testId: string
  title: string
  parts: ReadingPart[]
  totalTime: number // in minutes
}

export interface ListeningQuestion {
  id: number
  type: "fill-in-blank" | "multiple-choice" | "matching"
  label: string
  correctAnswer: string
}

export interface ListeningPart {
  partNumber: number
  title: string
  instruction: string
  audioUrl: string
  content: string // HTML content with embedded input fields
  questions: ListeningQuestion[]
}

export interface ListeningTest {
  testId: string
  title: string
  parts: ListeningPart[]
  totalTime: number
}

export interface WritingTask {
  taskNumber: number
  title: string
  instruction: string
  description: string
  imageUrl?: string
  chartData?: any
  minWords: number
  suggestedTime: number
}

export interface WritingTest {
  testId: string
  title: string
  tasks: WritingTask[]
  totalTime: number
}
