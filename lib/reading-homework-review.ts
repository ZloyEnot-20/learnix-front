import type { HomeworkAttempt } from "./admin-storage"
import type { IeltsReadingPart } from "./reading-data"
import {
  formatReadingCorrectAnswer,
  isReadingAnswerCorrect,
  resolveReadingQuestionPrompt,
} from "./ielts-reading-scoring"

export type ReadingReviewStatus = "correct" | "incorrect" | "skipped"

export interface ReadingReviewItem {
  questionId: number
  prompt: string
  status: ReadingReviewStatus
  userAnswer?: string
  correctAnswer: string
}

export function flattenReadingQuestions(parts: IeltsReadingPart[]) {
  return parts.flatMap((part) =>
    part.questions.map((question) => ({
      ...question,
      partInstruction: part.questionInstruction,
    })),
  )
}

export function buildReadingReviewItems(
  parts: IeltsReadingPart[],
  attempt: HomeworkAttempt,
): ReadingReviewItem[] {
  const mistakeById = new Map(attempt.mistakes.map((m) => [m.questionId, m]))
  const answerById = new Map(
    (attempt.readingAnswers ?? []).map((a) => [a.questionId, a.userAnswer]),
  )

  return flattenReadingQuestions(parts).map((question) => {
    const correctAnswer =
      mistakeById.get(question.id)?.correctAnswer || formatReadingCorrectAnswer(question)
    const prompt =
      mistakeById.get(question.id)?.prompt ||
      resolveReadingQuestionPrompt(
        question.question,
        question.options,
        question.partInstruction,
      )
    const userAnswer = answerById.get(question.id) ?? mistakeById.get(question.id)?.userAnswer

    if (!userAnswer?.trim()) {
      return { questionId: question.id, prompt, status: "skipped", correctAnswer }
    }

    const isCorrect = isReadingAnswerCorrect(question, userAnswer)
    return {
      questionId: question.id,
      prompt,
      status: isCorrect ? "correct" : "incorrect",
      userAnswer: userAnswer.trim(),
      correctAnswer,
    }
  })
}
