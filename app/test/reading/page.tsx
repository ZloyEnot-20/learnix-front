"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { TestHeader } from "@/components/test-header"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import { mockReadingTest } from "@/lib/mock-data/reading-test"
import { ReadingQuestionComponent } from "@/components/reading-test/reading-question"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { TestResultsModal } from "@/components/test-results-modal"
import { TestConfirmationDialog } from "@/components/test-confirmation-dialog"
import { testResultsApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function ReadingTestPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [currentPart, setCurrentPart] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showReview, setShowReview] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const headerRef = useRef<HTMLDivElement | null>(null)
  const footerRef = useRef<HTMLDivElement | null>(null)
  const [middleHeight, setMiddleHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    function recalc() {
      const vh = window.innerHeight
      const headerH = headerRef.current?.getBoundingClientRect().height || 0
      const footerH = footerRef.current?.getBoundingClientRect().height || 0
      const available = Math.max(0, vh - headerH - footerH)
      setMiddleHeight(available)
    }

    recalc()
    window.addEventListener("resize", recalc)
    const ro = new ResizeObserver(recalc)
    if (headerRef.current) ro.observe(headerRef.current)
    if (footerRef.current) ro.observe(footerRef.current)

    return () => {
      window.removeEventListener("resize", recalc)
      ro.disconnect()
    }
  }, [isLoading])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }

  const currentPartData = mockReadingTest.parts[currentPart]

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleNext = () => {
    if (currentPart < mockReadingTest.parts.length - 1) {
      setCurrentPart((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentPart > 0) {
      setCurrentPart((prev) => prev - 1)
    }
  }

  const handlePartChange = (partIndex: number) => {
    setCurrentPart(partIndex)
  }

  const getAnsweredQuestionsForPart = (partIndex: number) => {
    const part = mockReadingTest.parts[partIndex]
    const partQuestionIds = part.questions.map((q) => q.id)
    return partQuestionIds.filter((id) => answers[id]).length
  }

  const handleSubmit = () => {
    const totalQuestions = mockReadingTest.parts.reduce((sum, part) => sum + part.questions.length, 0)
    const answeredCount = Object.keys(answers).filter((key) => answers[Number.parseInt(key)]).length
    const unansweredCount = totalQuestions - answeredCount

    if (unansweredCount > 0) {
      setShowConfirmation(true)
    } else {
      submitTest()
    }
  }

  const submitTest = async () => {
    setSubmitting(true)
    let totalCorrect = 0
    mockReadingTest.parts.forEach((part) => {
      part.questions.forEach((question) => {
        if (question.type === "multiple-select") {
          // For multiple-select, check if all correct answers are selected
          const userAnswers = answers[question.id]?.split("|||").filter(Boolean) || []
          const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : []
          const isCorrect =
            userAnswers.length === correctAnswers.length && userAnswers.every((ans) => correctAnswers.includes(ans))
          if (isCorrect) totalCorrect++
        } else if (question.type === "summary-completion") {
          // For summary-completion, check the main question answer
          const userAnswer = answers[question.id]?.trim().toLowerCase()
          const correctAnswer =
            typeof question.correctAnswer === "string" ? question.correctAnswer.trim().toLowerCase() : ""
            console.log(userAnswer, question)
          if (userAnswer === correctAnswer) totalCorrect++
        } else if (question.type === "fill-in-blank") {
          // For fill-in-blank (part of summary), check individual answers
          const userAnswer = answers[question.id]?.trim().toLowerCase()
          const correctAnswer =
            typeof question.correctAnswer === "string" ? question.correctAnswer.trim().toLowerCase() : ""
          if (userAnswer === correctAnswer) totalCorrect++
        } else {
          // For other question types (true-false-not-given, etc.)
          const userAnswer = answers[question.id]?.trim().toUpperCase()
          const correctAnswer =
            typeof question.correctAnswer === "string" ? question.correctAnswer.trim().toUpperCase() : ""
          if (userAnswer === correctAnswer) totalCorrect++
        }
      })
    })

    const totalQuestions = mockReadingTest.parts.reduce((sum, part) => sum + part.questions.length, 0)
    const bandScoreTable = [
      { min: 39, max: 40, band: 9.0 },
      { min: 37, max: 38, band: 8.5 },
      { min: 35, max: 36, band: 8.0 },
      { min: 33, max: 34, band: 7.5 },
      { min: 30, max: 32, band: 7.0 },
      { min: 27, max: 29, band: 6.5 },
      { min: 23, max: 26, band: 6.0 },
      { min: 19, max: 22, band: 5.5 },
      { min: 15, max: 18, band: 5.0 },
      { min: 13, max: 14, band: 4.5 },
      { min: 10, max: 12, band: 4.0 },
      { min: 0, max: 9, band: 3.5 },
    ]
    const bandScore = bandScoreTable.find((range) => totalCorrect >= range.min && totalCorrect <= range.max)?.band || 0

    try {
      await testResultsApi.save({
        testType: "reading",
        date: new Date().toISOString(),
        bandScore,
        totalCorrect,
        totalQuestions,
        answers,
        parts: mockReadingTest.parts,
      })
      toast({
        title: "Test submitted successfully!",
        description: "Your results have been saved. View them on your profile page.",
        duration: 5000,
      })
    } catch {
      toast({
        title: "Could not save results",
        description: "Your score is shown below but wasn't saved to the server.",
        variant: "destructive",
      })
    }

    setSubmitting(false)
    setShowResults(true)
    setShowConfirmation(false)
  }

  const isLastPart = currentPart === mockReadingTest.parts.length - 1
  const totalQuestions = mockReadingTest.parts.reduce((sum, part) => sum + part.questions.length, 0)
  const answeredCount = Object.keys(answers).filter((key) => answers[Number.parseInt(key)]).length
  const unansweredCount = totalQuestions - answeredCount

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <div className="h-fit flex-shrink-0" ref={headerRef}>
        <TestHeader testTakerId="Test taker ID" />
      </div>

      <div className="h-fit flex-shrink-0 bg-gray-100 px-6 py-4 border-b">
        <h2 className="font-bold text-lg">{currentPartData.title}</h2>
        <p className="text-sm">{currentPartData.instruction}</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 border-r overflow-y-auto p-8 box-border">
          <h3 className="text-xl font-bold mb-4">{currentPartData.passageTitle}</h3>
          <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-line">{currentPartData.passage}</div>
        </div>

        <div className="w-1/2 bg-gray-50 overflow-y-auto box-border">
          <div className="p-8">
            <div className="bg-white p-4 rounded border mb-6">
              <h3 className="font-bold mb-2">
                Questions {currentPartData.questions[0].id}–
                {currentPartData.questions[currentPartData.questions.length - 1].id}
              </h3>
              <p className="text-sm leading-relaxed">{currentPartData.questionInstruction}</p>
            </div>

            {currentPartData.questions.map((question) => (
              <ReadingQuestionComponent
                key={question.id}
                question={question}
                answer={answers[question.id]}
                answers={answers}
                onAnswerChange={handleAnswerChange}
              />
            ))}
          </div>
        </div>
      </div>

      <div ref={footerRef} className="h-fit flex-shrink-0 border-t bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {mockReadingTest.parts.map((part, index) => {
              const answeredCount = getAnsweredQuestionsForPart(index)
              const isCurrentPart = index === currentPart

              return (
                <button
                  key={part.partNumber}
                  onClick={() => handlePartChange(index)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    isCurrentPart ? "bg-blue-500 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <span className="font-bold">Part {part.partNumber}</span>
                  <span className="text-xs">
                    {answeredCount} of {part.totalQuestions}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Checkbox id="review" checked={showReview} onCheckedChange={(checked) => setShowReview(!!checked)} />
              <Label htmlFor="review" className="text-sm cursor-pointer">
                Review
              </Label>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentPart === 0}
              className="bg-gray-200 hover:bg-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {!isLastPart ? (
              <Button variant="default" size="icon" onClick={handleNext} className="bg-black hover:bg-gray-800">
                <ChevronRight className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                variant="default"
                size="default"
                onClick={handleSubmit}
                loading={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="w-5 h-5" />
                <span>Submit</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {showResults && (
        <TestResultsModal
          isOpen={showResults}
          key={showResults ? "open" : "closed"}
          onClose={() => setShowResults(false)}
          testType="reading"
          answers={answers}
          parts={mockReadingTest.parts}
          viewOnly={false}
          onBack={() => setShowResults(false)}
        />
      )}

      {showConfirmation && (
        <TestConfirmationDialog
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={submitTest}
          unansweredCount={unansweredCount}
          totalQuestions={totalQuestions}
          confirming={submitting}
        />
      )}
    </div>
  )
}
