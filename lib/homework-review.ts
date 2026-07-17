import type { HomeworkMistake } from "./admin-storage"
import { formatFillBlankCorrectAnswer } from "./fill-blank-answers"
import { resolveQuestionType } from "./grammar-question-types"
import type { GrammarExercise, GrammarQuestion } from "./grammar-types"

export function getReviewQuestions(exercise: GrammarExercise): GrammarQuestion[] {
  if (exercise.type === "matching") {
    const pairs = exercise.content.pairs ?? []
    return pairs.map((p, i) => ({
      id: i + 1,
      text: p.left,
      correctAnswer: p.right,
      explanation: "",
    }))
  }
  return exercise.content.questions ?? []
}

export function questionCorrectAnswer(
  exercise: GrammarExercise,
  question: GrammarQuestion,
): string {
  const type = resolveQuestionType(question, exercise.type)
  switch (type) {
    case "fill-in-the-blank":
      return formatFillBlankCorrectAnswer(question)
    case "multiple-choice":
    case "matching":
      return question.correctAnswer ?? ""
    case "true-false":
      return question.correctBool ? "True" : "False"
    case "word-formation":
    case "sentence-transformation":
      return question.answer ?? ""
    case "word-order": {
      const prefix = (question.prefix ?? []).join(" ")
      const suffix = (question.suffix ?? []).join(" ")
      const core = (question.correct ?? []).join(" ")
      return [prefix, core, suffix].filter(Boolean).join(" ")
    }
    case "error-correction":
      if (question.answer) return question.answer
      return (question.segments ?? [])
        .map((s) => (s.correctText ?? s.text) + (s.after ?? ""))
        .join("")
        .trim()
    default:
      return question.correctAnswer ?? question.answer ?? ""
  }
}

/** Prefer live exercise content over stored attempt data (legacy mistakes may show blank hints). */
export function resolveMistakeCorrectAnswer(
  exercise: GrammarExercise | null | undefined,
  mistake: Pick<HomeworkMistake, "questionId" | "correctAnswer">,
): string {
  if (!exercise) return mistake.correctAnswer
  const question = getReviewQuestions(exercise).find((q) => q.id === mistake.questionId)
  if (!question) return mistake.correctAnswer
  const computed = questionCorrectAnswer(exercise, question)
  return computed || mistake.correctAnswer
}
