"use client"

import { Input } from "@/components/ui/input"

interface ListeningContentProps {
  content: string
  answers: Record<number, string>
  onAnswerChange: (questionId: number, answer: string) => void
}

export function ListeningContent({ content, answers, onAnswerChange }: ListeningContentProps) {
  // Parse content and replace [1], [2], etc. with input fields
  const renderContent = () => {
    const parts = content.split(/(\[\d+\])/)
    return parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/)
      if (match) {
        const questionId = Number.parseInt(match[1])
        return (
          <span key={index} className="inline-flex items-center mx-1">
            <Input
              type="text"
              value={answers[questionId] || ""}
              onChange={(e) => onAnswerChange(questionId, e.target.value)}
              className="w-32 h-8 inline-block text-center border-blue-500 border-2"
           
            />
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  return <div className="whitespace-pre-wrap leading-relaxed">{renderContent()}</div>
}
