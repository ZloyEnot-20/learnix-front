"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import type { ReadingQuestion } from "@/lib/test-types"

interface TrueFalseNotGivenQuestionProps {
  question: ReadingQuestion
  answer: string
  onAnswerChange: (questionId: number, answer: string) => void
}

export function TrueFalseNotGivenQuestion({ question, answer, onAnswerChange }: TrueFalseNotGivenQuestionProps) {
  return (
    <div className="mb-6 p-4 bg-white rounded border">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded flex items-center justify-center font-semibold text-sm">
          {question.id}
        </div>
        <p className="text-sm leading-relaxed">{question.question}</p>
      </div>
      <RadioGroup value={answer} onValueChange={(value) => onAnswerChange(question.id, value)} className="ml-11">
        <div className="flex items-center space-x-2 mb-2">
          <RadioGroupItem value="TRUE" id={`q${question.id}-true`} />
          <Label htmlFor={`q${question.id}-true`} className="cursor-pointer text-sm">
            TRUE
          </Label>
        </div>
        <div className="flex items-center space-x-2 mb-2">
          <RadioGroupItem value="FALSE" id={`q${question.id}-false`} />
          <Label htmlFor={`q${question.id}-false`} className="cursor-pointer text-sm">
            FALSE
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="NOT GIVEN" id={`q${question.id}-not-given`} />
          <Label htmlFor={`q${question.id}-not-given`} className="cursor-pointer text-sm">
            NOT GIVEN
          </Label>
        </div>
      </RadioGroup>
    </div>
  )
}
