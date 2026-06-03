"use client"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import type { ReadingQuestion } from "@/lib/test-types"
import { MultipleChoiceQuestion } from "@/components/question-types/multiple-choice-question"
import { TrueFalseNotGivenQuestion } from "@/components/question-types/true-false-not-given-question"
import { YesNoNotGivenQuestion } from "@/components/question-types/yes-no-not-given-question"
import { MatchingHeadingsQuestion } from "@/components/question-types/matching-headings-question"
import { MatchingInformationQuestion } from "@/components/question-types/matching-information-question"
import { SentenceCompletionQuestion } from "@/components/question-types/sentence-completion-question"
import { ShortAnswerQuestion } from "@/components/question-types/short-answer-question"
import { DiagramLabelCompletionQuestion } from "@/components/question-types/diagram-label-completion-question"

interface ReadingQuestionProps {
  question: ReadingQuestion
  answer: string
  answers: any
  onAnswerChange: (questionId: number, answer: string) => void
}

export function ReadingQuestionComponent({ question, answer, onAnswerChange, answers }: ReadingQuestionProps) {
  if (question.type === "multiple-choice") {
    return <MultipleChoiceQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "multiple-select") {
    const selectedAnswers = answer ? answer.split("|||") : []
    const selectCount = question.selectCount || 2

    const handleCheckboxChange = (option: string, checked: boolean) => {
      let newSelected = [...selectedAnswers]
      if (checked) {
        if (newSelected.length < selectCount) {
          newSelected.push(option)
        }
      } else {
        newSelected = newSelected.filter((a) => a !== option)
      }
      onAnswerChange(question.id, newSelected.join("|||"))
    }

    return (
      <div className="mb-6 p-4 bg-white rounded border">
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h4 className="font-bold text-sm mb-1">
            Questions {question.id}–{question.id + (selectCount - 1)}
          </h4>
          <p className="text-sm">
            Choose{" "}
            <span className="font-bold">{selectCount === 2 ? "TWO" : selectCount === 3 ? "THREE" : selectCount}</span>{" "}
            correct answers.
          </p>
        </div>
        <div className="mb-3">
          <p className="text-sm font-medium leading-relaxed">
            {question.id}–{question.id + (selectCount - 1)} {question.question}
          </p>
        </div>
        <div className="space-y-3">
          {question.options?.map((option, index) => {
            const isChecked = selectedAnswers.includes(option)
            const isDisabled = !isChecked && selectedAnswers.length >= selectCount

            return (
              <div key={index} className="flex items-start gap-3">
                <Checkbox
                  id={`q${question.id}-option-${index}`}
                  checked={isChecked}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => handleCheckboxChange(option, !!checked)}
                />
                <Label
                  htmlFor={`q${question.id}-option-${index}`}
                  className={`text-sm leading-relaxed cursor-pointer ${isDisabled ? "opacity-50" : ""}`}
                >
                  {option}
                </Label>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (question.type === "summary-completion" && question.summaryText && question.blankIds) {
    return (
      <div className="mb-6 p-4 bg-white rounded border">
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h4 className="font-bold text-sm mb-1">
            Questions {question.blankIds[0]}–{question.blankIds[question.blankIds.length - 1]}
          </h4>
          <p className="text-sm">{question.question}</p>
        </div>
        <div className="text-sm leading-relaxed">
          {question.summaryText.split(/(\[\d+\])/).map((part, index) => {
            const match = part.match(/\[(\d+)\]/)
            if (match) {
              const blankId = match[1]
              console.log(blankId)
              return (
                <Input
                  key={blankId}
                  type="text"
                  value={answers[blankId] || ""}
                  onChange={(e) => onAnswerChange(blankId, e.target.value)}
                  className="inline-block w-32 h-8 mx-1 text-center"
                  placeholder={blankId}
                />
              )
            }
            return <span key={index}>{part}</span>
          })}
        </div>
      </div>
    )
  }

  if (question.type === "fill-in-blank") {
    // This is handled by the summary-completion parent question
    return null
  }

  if (question.type === "true-false-not-given") {
    return <TrueFalseNotGivenQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "yes-no-not-given") {
    return <YesNoNotGivenQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "matching-headings") {
    return <MatchingHeadingsQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "matching") {
    return <MatchingInformationQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "matching-sentence-endings") {
    return <MatchingInformationQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "matching-features") {
    return <MatchingInformationQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "sentence-completion") {
    return <SentenceCompletionQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "short-answer") {
    return <ShortAnswerQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  if (question.type === "diagram-label-completion") {
    return <DiagramLabelCompletionQuestion question={question} answer={answer} onAnswerChange={onAnswerChange} />
  }

  return null
}
