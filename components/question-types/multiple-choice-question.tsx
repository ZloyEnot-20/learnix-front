"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { ReadingQuestion } from "@/lib/test-types"

interface MultipleChoiceQuestionProps {
  question: ReadingQuestion
  answer: string
  onAnswerChange: (questionId: number, answer: string) => void
}

export function MultipleChoiceQuestion({ question, answer, onAnswerChange }: MultipleChoiceQuestionProps) {
  return (
    <div className="mb-6 p-4 bg-white rounded border">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded flex items-center justify-center font-semibold text-sm">
          {question.id}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-3 leading-relaxed">{question.question}</p>
          <RadioGroup value={answer} onValueChange={(value) => onAnswerChange(question.id, value)}>
            <div className="space-y-2">
              {question.options?.map((option, index) => (
                <div key={index} className="flex items-start gap-3">
                  <RadioGroupItem value={option} id={`q${question.id}-option-${index}`} className="mt-1" />
                  <Label htmlFor={`q${question.id}-option-${index}`} className="text-sm cursor-pointer leading-relaxed">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  )
}
