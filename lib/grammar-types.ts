export type GrammarDifficulty = "easy" | "medium" | "hard" | "mixed"

export type GrammarCategory = "grammar" | "vocabulary" | "speaking"

export type GrammarExerciseType =
  | "fill-in-the-blank"
  | "multiple-choice"
  | "matching"
  | "word-formation"
  | "sentence-transformation"
  | "true-false"
  | "error-correction"
  | "word-order"
  | "speaking"

/** Display labels for each exercise type, in the order they should appear in filters. */
export const EXERCISE_TYPE_LABELS: Record<GrammarExerciseType, string> = {
  "multiple-choice": "Multiple choice",
  "fill-in-the-blank": "Fill in the gaps",
  matching: "Matching",
  "word-formation": "Word formation",
  "sentence-transformation": "Sentence transformation",
  "error-correction": "Error correction",
  "word-order": "Word order",
  "true-false": "True / False",
}

export const EXERCISE_TYPE_ORDER: GrammarExerciseType[] = [
  "multiple-choice",
  "fill-in-the-blank",
  "matching",
  "word-formation",
  "sentence-transformation",
  "error-correction",
  "word-order",
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
  /** Extra accepted full answers, case/punctuation tolerant. (word-formation, sentence-transformation) */
  accepted?: string[]
  /** Correct truth value of the statement. (true-false) */
  correctBool?: boolean
  /** Clickable sentence chunks for click-to-edit grading. (error-correction) */
  segments?: ErrorSegment[]
  /** Fixed leading words shown before the orderable words. (word-order) */
  prefix?: string[]
  /** Words to arrange into the correct order. (word-order) */
  scrambled?: string[]
  /** The canonical correct ordering of `scrambled`. (word-order) */
  correct?: string[]
  /** Fixed trailing words shown after the orderable words. (word-order) */
  suffix?: string[]
  /** Other accepted orderings besides `correct`. (word-order) */
  alternates?: string[][]
  explanation: string
  hint?: string
  prepTimeSeconds?: number
  speakTimeSeconds?: number
}

/** A subject/answer pair for matching exercises. */
export interface MatchingPair {
  left: string
  right: string
}

/**
 * A clickable chunk of a sentence in an error-correction exercise. Segments with
 * a `correctText` carry the mistake; the student clicks the wrong chunk and
 * replaces it. Sentences with no `correctText` anywhere are already correct.
 */
export interface ErrorSegment {
  id: string
  text: string
  /** Literal text (space/punctuation) rendered after this segment. */
  after?: string
  /** The fixed version of this chunk, when it contains a mistake. */
  correctText?: string
  /** Extra accepted fixes for this chunk. */
  acceptableText?: string[]
  hint?: string
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
