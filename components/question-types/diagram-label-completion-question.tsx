"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"
import type { ReadingQuestion } from "@/lib/test-types"

interface DiagramLabelCompletionQuestionProps {
  question: ReadingQuestion
  answer: string
  onAnswerChange: (questionId: number, answer: string) => void
}

export function DiagramLabelCompletionQuestion({
  question,
  answer,
  onAnswerChange,
}: DiagramLabelCompletionQuestionProps) {
  return (
    <div className="mb-6 p-4 bg-white rounded border">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-200 rounded flex items-center justify-center font-semibold text-sm">
          {question.id}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-3 leading-relaxed">{question.question}</p>
          {question.diagramUrl && (
            <div className="mb-3 bg-gray-50 p-3 rounded">
              <Image
                src={question.diagramUrl || "/placeholder.svg"}
                alt="Diagram"
                width={300}
                height={200}
                className="max-w-full h-auto"
              />
            </div>
          )}
          <Select value={answer} onValueChange={(value) => onAnswerChange(question.id, value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a label..." />
            </SelectTrigger>
            <SelectContent>
              {question.labelOptions?.map((option, index) => (
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
