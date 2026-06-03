export type GrammarDifficulty = "easy" | "medium" | "hard"

export type GrammarCategory = "grammar" | "vocabulary"

export type GrammarExerciseType =
  | "fill-in-the-blank"
  | "multiple-choice"
  | "matching"
  | "word-formation"
  | "sentence-transformation"
  | "true-false"

/** Display labels for each exercise type, in the order they should appear in filters. */
export const EXERCISE_TYPE_LABELS: Record<GrammarExerciseType, string> = {
  "multiple-choice": "Multiple choice",
  "fill-in-the-blank": "Fill in the gaps",
  matching: "Matching",
  "word-formation": "Word formation",
  "sentence-transformation": "Sentence transformation",
  "true-false": "True / False",
}

export const EXERCISE_TYPE_ORDER: GrammarExerciseType[] = [
  "multiple-choice",
  "fill-in-the-blank",
  "matching",
  "word-formation",
  "sentence-transformation",
  "true-false",
]

export interface GrammarQuestion {
  id: number
  instruction?: string
  /** Sentence text. For fill-in-the-blank it contains `_____` placeholders. */
  text: string
  /** Canonical answer per blank, used as display fallback. (fill-in-the-blank) */
  blanks?: string[]
  /** Per-blank list of accepted answers (case-insensitive, trimmed). (fill-in-the-blank) */
  acceptableAnswers?: string[][]
  /** Selectable options. (multiple-choice) */
  options?: string[]
  /** The single correct option text. (multiple-choice) */
  correctAnswer?: string
  /** Single canonical answer. (word-formation, sentence-transformation) */
  answer?: string
  /** Correct truth value of the statement. (true-false) */
  correctBool?: boolean
  explanation: string
  hint?: string
}

/** A subject/answer pair for matching exercises. */
export interface MatchingPair {
  left: string
  right: string
}

export interface GrammarExerciseContent {
  /** Present for question-based types. */
  questions?: GrammarQuestion[]
  /** Present for matching exercises. */
  pairs?: MatchingPair[]
}

export interface GrammarExercise {
  id: string
  slug: string
  title: string
  description: string
  category: GrammarCategory
  topic: string
  subtopic: string
  difficulty: GrammarDifficulty
  level: string
  type: GrammarExerciseType
  estimatedTime: number
  totalQuestions: number
  passingScore: number
  tags: string[]
  instructions: string
  tips: string[]
  content: GrammarExerciseContent
}

export const GRAMMAR_BLANK_TOKEN = "_____"
