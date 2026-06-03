"use client"

import { Input } from "@/components/ui/input"
import type { ReadingQuestion } from "@/lib/test-types"

interface SentenceCompletionQuestionProps {
  question: ReadingQuestion
  answer: string
  onAnswerChange: (questionId: number, answer: string) => void
}

export function SentenceCompletionQuestion({ question, answer, onAnswerChange }: SentenceCompletionQuestionProps) {
  return (
    <div className="mb-6 p-4 bg-white rounded border">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded flex items-center justify-center font-semibold text-sm">
          {question.id}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-3 leading-relaxed">{question.question}</p>
          <Input
            type="text"
            value={answer}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            placeholder="Enter your answer (max 3 words)"
            className="w-full"
          />
        </div>
      </div>
    </div>
  )
}
