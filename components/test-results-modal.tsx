"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, X, Minus, Trophy, Target, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

interface Question {
  id: number
  correctAnswer: string | string[]
  type?: string
}

interface Part {
  partNumber: number
  questions: Question[]
}

interface TestResultsModalProps {
  isOpen: boolean
  onClose: () => void
  testType: "reading" | "listening" | "writing" | "speaking"
  answers: Record<number, string>
  parts: Part[]
  onRetry?: () => void
  viewOnly?: boolean
  onBack?: () => void
}

const TEST_COLORS = {
  reading: "	#9566aa",
  listening: "#ffcc3e",
  writing: "#a7e237",
  speaking: "#9fcffb",
}

const BAND_SCORES = {
  reading: [
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
  ],
  listening: [
    { min: 39, max: 40, band: 9.0 },
    { min: 37, max: 38, band: 8.5 },
    { min: 35, max: 36, band: 8.0 },
    { min: 32, max: 34, band: 7.5 },
    { min: 30, max: 31, band: 7.0 },
    { min: 26, max: 29, band: 6.5 },
    { min: 23, max: 25, band: 6.0 },
    { min: 18, max: 22, band: 5.5 },
    { min: 16, max: 17, band: 5.0 },
    { min: 13, max: 15, band: 4.5 },
    { min: 10, max: 12, band: 4.0 },
    { min: 0, max: 9, band: 3.5 },
  ],
}

export function TestResultsModal({
  isOpen,
  onClose,
  testType,
  answers,
  parts,
  onRetry,
  viewOnly = false,
  onBack,
}: TestResultsModalProps) {
  const router = useRouter()
  const themeColor = TEST_COLORS[testType]

  // Calculate results
  const calculateResults = () => {
    let totalCorrect = 0
    let totalQuestions = 0
    const partResults: Array<{ partNumber: number; correct: number; total: number; percentage: number }> = []

    parts.forEach((part) => {
      let partCorrect = 0
      const partTotal = part.questions.length

      part.questions.forEach((question) => {
        const userAnswer = answers[question.id]

        // Handle array correctAnswer (multiple-select questions)
        if (Array.isArray(question.correctAnswer)) {
          const userAnswers = userAnswer?.split("|||").filter(Boolean) || []
          const correctAnswers = question.correctAnswer
          const isCorrect =
            userAnswers.length === correctAnswers.length && userAnswers.every((ans) => correctAnswers.includes(ans))

          if (isCorrect) {
            partCorrect++
            totalCorrect++
          }
        } else {
          // Handle string correctAnswer (all other question types)
          const userAnswerNormalized = userAnswer?.trim().toUpperCase()
          const correctAnswerNormalized = question.correctAnswer.trim().toUpperCase()

          if (userAnswerNormalized === correctAnswerNormalized) {
            partCorrect++
            totalCorrect++
          }
        }
      })

      totalQuestions += partTotal
      partResults.push({
        partNumber: part.partNumber,
        correct: partCorrect,
        total: partTotal,
        percentage: Math.round((partCorrect / partTotal) * 100),
      })
    })

    return { totalCorrect, totalQuestions, partResults }
  }

  const { totalCorrect, totalQuestions, partResults } = calculateResults()

  // Calculate band score
  const bandScoreTable =
    testType === "reading" || testType === "listening" ? BAND_SCORES[testType] : BAND_SCORES.reading
  const bandScore = bandScoreTable.find((range) => totalCorrect >= range.min && totalCorrect <= range.max)?.band || 0

  // Get feedback message
  const getFeedback = (score: number) => {
    if (score >= 8.0) return "Outstanding performance! You have excellent command of the language."
    if (score >= 7.0) return "Great job! You demonstrate good operational command of the language."
    if (score >= 6.0) return "Good work! You have generally effective command of the language."
    if (score >= 5.0) return "Fair performance. Keep practicing to improve your skills."
    return "You need more practice. Focus on understanding the fundamentals."
  }

  // Get question status
  const getQuestionStatus = (questionId: number, correctAnswer: string | string[]) => {
    const userAnswer = answers[questionId]
    if (!userAnswer) return "unanswered"

    // Handle array correctAnswer (multiple-select questions)
    if (Array.isArray(correctAnswer)) {
      const userAnswers = userAnswer.split("|||").filter(Boolean)
      const isCorrect =
        userAnswers.length === correctAnswer.length && userAnswers.every((ans) => correctAnswer.includes(ans))
      return isCorrect ? "correct" : "incorrect"
    }

    // Handle string correctAnswer (all other question types)
    return userAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase() ? "correct" : "incorrect"
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
  }

  const handleReturnToDashboard = () => {
    onClose()
    router.push("/dashboard")
  }

  const handleBack = () => {
    onClose()

    if (onBack) {
      onBack()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg" style={{ backgroundColor: themeColor }}>
              <Trophy className="w-6 h-6 text-white" />
            </div>
            Test Results - {testType.charAt(0).toUpperCase() + testType.slice(1)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Overall Score */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Overall Band Score</p>
            </div>
            <p className="text-5xl font-bold mb-2" style={{ color: themeColor }}>
              {bandScore.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {totalCorrect} out of {totalQuestions} correct answers
            </p>
            <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm leading-relaxed">{getFeedback(bandScore)}</p>
            </div>
          </div>

          {/* Part Scores */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Performance by Part</h3>
            </div>
            <div className="grid gap-3">
              {partResults.map((result) => (
                <div key={result.partNumber} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Part {result.partNumber}</span>
                    <span className="text-sm font-semibold">
                      {result.correct}/{result.total} ({result.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${result.percentage}%`, backgroundColor: themeColor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question Details */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Question Details</h3>
            <div className="space-y-4">
              {parts.map((part) => (
                <div key={part.partNumber} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Part {part.partNumber}</h4>
                  <div className="grid grid-cols-10 gap-2">
                    {part.questions.map((question) => {
                      const status = getQuestionStatus(question.id, question.correctAnswer)
                      return (
                        <div
                          key={question.id}
                          className="aspect-square rounded flex items-center justify-center text-xs font-medium relative group"
                          style={{
                            backgroundColor:
                              status === "correct" ? "#22c55e" : status === "incorrect" ? "#ef4444" : "#9ca3af",
                            color: "white",
                          }}
                        >
                          {status === "correct" && <Check className="w-3 h-3" />}
                          {status === "incorrect" && <X className="w-3 h-3" />}
                          {status === "unanswered" && <Minus className="w-3 h-3" />}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                            Q{question.id}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span>Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Incorrect</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400" />
              <span>Unanswered</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {viewOnly ? (
              <Button
                onClick={handleBack}
                className="flex-1 hover:cursor-pointer hover:opacity-[0.8]"
                style={{ backgroundColor: themeColor }}
              >
                Back
              </Button>
            ) : (
              <Button
                onClick={handleReturnToDashboard}
                className="flex-1 hover:cursor-pointer hover:opacity-[0.8]"
                style={{ backgroundColor: themeColor }}
              >
                Return to Dashboard
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
