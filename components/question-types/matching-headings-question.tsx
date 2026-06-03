"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ReadingQuestion } from "@/lib/test-types"

interface MatchingHeadingsQuestionProps {
  question: ReadingQuestion
  answer: string
  onAnswerChange: (questionId: number, answer: string) => void
}

export function MatchingHeadingsQuestion({ question, answer, onAnswerChange }: MatchingHeadingsQuestionProps) {
  return (
    <div className="mb-6 p-4 bg-white rounded border">
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <h4 className="font-bold text-sm mb-1">Questions {question.id}</h4>
        <p className="text-sm">Choose the correct heading for each paragraph.</p>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded flex items-center justify-center font-semibold text-sm">
          {question.id}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-3 leading-relaxed">{question.question}</p>
          <Select value={answer} onValueChange={(value) => onAnswerChange(question.id, value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a heading..." />
            </SelectTrigger>
            <SelectContent>
              {question.matchingOptions?.map((option, index) => (
                <SelectItem key={index} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
