"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { TestHeader } from "@/components/test-header"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { mockListeningTest } from "@/lib/mock-data/listening-test"
import { ListeningContent } from "@/components/listening-test/listening-content"
import { TestResultsModal } from "@/components/test-results-modal"
import { TestConfirmationDialog } from "@/components/test-confirmation-dialog"
import { saveTestResult } from "@/lib/test-results-storage"
import { useToast } from "@/hooks/use-toast"

export default function ListeningTestPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [currentPart, setCurrentPart] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [isAudioPlaying, setIsAudioPlaying] = useState(true)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [showResults, setShowResults] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAudioPlaying(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }

  const currentPartData = mockListeningTest.parts[currentPart]
  const totalParts = mockListeningTest.parts.length

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  const handleNext = () => {
    if (currentPart < totalParts - 1) {
      setCurrentPart((prev) => prev + 1)
      setIsAudioPlaying(true)
    }
  }

  const handlePrevious = () => {
    if (currentPart > 0) {
      setCurrentPart((prev) => prev - 1)
      setIsAudioPlaying(true)
    }
  }

  const handleSubmit = () => {
    const totalQuestions = mockListeningTest.parts.reduce((sum, part) => sum + part.questions.length, 0)
    const answeredCount = Object.keys(answers).filter((key) => answers[Number.parseInt(key)]).length
    const unansweredCount = totalQuestions - answeredCount

    if (unansweredCount > 0) {
      setShowConfirmation(true)
    } else {
      submitTest()
    }
  }

  const submitTest = () => {
    let totalCorrect = 0
    mockListeningTest.parts.forEach((part) => {
      part.questions.forEach((question) => {
        const userAnswer = answers[question.id]?.trim().toUpperCase()
        const correctAnswer = question.correctAnswer.trim().toUpperCase()
        if (userAnswer === correctAnswer) {
          totalCorrect++
        }
      })
    })

    const totalQuestions = mockListeningTest.parts.reduce((sum, part) => sum + part.questions.length, 0)
    const bandScoreTable = [
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
    ]
    const bandScore = bandScoreTable.find((range) => totalCorrect >= range.min && totalCorrect <= range.max)?.band || 0

    saveTestResult({
      id: `listening-${Date.now()}`,
      testType: "listening",
      date: new Date().toISOString(),
      bandScore,
      totalCorrect,
      totalQuestions,
      answers,
      parts: mockListeningTest.parts,
    })

    toast({
      title: "Test submitted successfully!",
      description: "Your results have been saved. View them on your profile page.",
      duration: 5000,
    })

    setShowResults(true)
    setShowConfirmation(false)
  }

  const handleRetry = () => {
    setShowResults(false)
    setTimeout(() => {
      setAnswers({})
      setCurrentPart(0)
      setIsAudioPlaying(true)
    }, 300)
  }

  const totalQuestions = mockListeningTest.parts.reduce((sum, part) => sum + part.questions.length, 0)
  const answeredCount = Object.keys(answers).filter((key) => answers[Number.parseInt(key)]).length
  const unansweredCount = totalQuestions - answeredCount
  console.log(showResults, "lis")
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <div className="h-fit flex-shrink-0">
        <TestHeader testTakerId="Test taker ID" showAudioIndicator={isAudioPlaying} />
      </div>

      <audio ref={audioRef} src={currentPartData.audioUrl} />

      <div className="h-fit flex-shrink-0 bg-gray-100 px-6 py-4 border-b">
        <h2 className="font-bold text-lg">{currentPartData.title}</h2>
        <p className="text-sm">{currentPartData.instruction}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <ListeningContent content={currentPartData.content} answers={answers} onAnswerChange={handleAnswerChange} />
        </div>
      </div>

      <div className="h-fit flex-shrink-0 border-t bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Parts</span>
              <div className="flex gap-1">
                {mockListeningTest.parts.map((part, index) => {
                  const partAnswers = part.questions.filter((q) => answers[q.id]).length
                  return (
                    <button
                      key={part.partNumber}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        index === currentPart
                          ? "bg-blue-500 text-white"
                          : partAnswers > 0
                            ? "bg-gray-300"
                            : "bg-gray-100 border"
                      }`}
                      onClick={() => {
                        setCurrentPart(index)
                        setIsAudioPlaying(true)
                      }}
                    >
                      Part {part.partNumber} ({partAnswers}/{part.questions.length})
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              disabled={currentPart === 0}
              className="bg-gray-200 hover:bg-gray-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            {currentPart === totalParts - 1 ? (
              <Button variant="default" onClick={handleSubmit} className="bg-[#C8102E] hover:bg-[#A00D24]">
                Submit Test
              </Button>
            ) : (
              <Button variant="default" size="icon" onClick={handleNext} className="bg-black hover:bg-gray-800">
                <ChevronRight className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <TestResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        testType="listening"
        answers={answers}
        parts={mockListeningTest.parts}
        onRetry={handleRetry}
        viewOnly={false}
        onBack={() => setShowResults(false)}
      />

      <TestConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={submitTest}
        unansweredCount={unansweredCount}
        totalQuestions={totalQuestions}
      />

      <div className="fixed bottom-20 right-6 w-48 h-32 bg-white border-2 border-gray-300 rounded shadow-lg overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
          <div className="text-center text-xs text-muted-foreground">
            <p>Audio Visualization</p>
            <div className="flex gap-1 justify-center mt-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-blue-500 rounded animate-pulse"
                  style={{
                    height: `${Math.random() * 20 + 10}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
