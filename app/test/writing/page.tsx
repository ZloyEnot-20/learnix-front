"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { TestHeader } from "@/components/test-header"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Edit, ArrowRight } from "lucide-react"
import { mockWritingTest } from "@/lib/mock-data/writing-test"

export default function WritingTestPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [currentTask, setCurrentTask] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(60) // minutes
  const [showReview, setShowReview] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    // Timer countdown
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C8102E]" />
      </div>
    )
  }

  const currentTaskData = mockWritingTest.tasks[currentTask]
  const wordCount = (answers[currentTask] || "").trim().split(/\s+/).filter(Boolean).length

  const handleAnswerChange = (text: string) => {
    setAnswers((prev) => ({ ...prev, [currentTask]: text }))
  }

  const handleNextTask = () => {
    if (currentTask < mockWritingTest.tasks.length - 1) {
      setCurrentTask((prev) => prev + 1)
    }
  }

  const handleSubmit = () => {
    alert("Test submitted! Redirecting to results...")
    router.push("/dashboard")
  }

  const handleHelp = () => {
    alert("Help information will be displayed here")
  }

  const handleHide = () => {
    alert("Task instructions hidden")
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TestHeader
        testTakerId={`XXXX XXXXXXX - ${123456}`}
        timer={`${timeRemaining} minutes left`}
        onHelp={handleHelp}
        onHide={handleHide}
      />

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex overflow-hidden bg-[#E8EDF2]">
        {/* Left Side - Task Description */}
        <div className="w-2/5 overflow-y-auto p-8 bg-[#E8EDF2]">
          <h2 className="text-xl font-bold mb-4">{currentTaskData.title}</h2>

          <div className="bg-white p-4 rounded mb-6">
            <p className="font-semibold mb-2">{currentTaskData.instruction}</p>
          </div>

          <div className="bg-white p-6 rounded">
            <p className="mb-4 leading-relaxed whitespace-pre-line">{currentTaskData.description}</p>

            {currentTaskData.imageUrl && (
              <div className="mt-6 bg-white p-4 border rounded">
                <img
                  src={currentTaskData.imageUrl || "/placeholder.svg"}
                  alt="Chart for writing task"
                  className="w-full h-auto"
                  crossOrigin="anonymous"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Writing Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#E8EDF2]">
          <div className="h-full flex flex-col">
            <Textarea
              value={answers[currentTask] || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Start writing your answer here..."
              className="flex-1 resize-none p-4 text-base leading-relaxed bg-white border-2 border-blue-400 focus:border-blue-500 rounded"
            />
            <div className="mt-4 text-sm text-muted-foreground bg-white px-4 py-2 rounded border">
              Word Count: {wordCount}
              {wordCount < currentTaskData.minWords && (
                <span className="ml-2 text-orange-600">(Minimum {currentTaskData.minWords} words required)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="border-t bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="review" checked={showReview} onCheckedChange={(checked) => setShowReview(!!checked)} />
              <Label htmlFor="review" className="text-sm cursor-pointer">
                Review
              </Label>
            </div>

            {/* Task Navigation */}
            <div className="flex gap-2">
              {mockWritingTest.tasks.map((task, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTask(index)}
                  className={`px-4 py-2 rounded text-sm font-medium ${
                    index === currentTask
                      ? "bg-blue-500 text-white"
                      : answers[index]
                        ? "bg-gray-300"
                        : "bg-gray-100 border"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="bg-yellow-400 hover:bg-yellow-500 border-0">
              <Edit className="w-5 h-5" />
            </Button>

            {currentTask < mockWritingTest.tasks.length - 1 ? (
              <Button
                onClick={handleNextTask}
                className="bg-black hover:bg-gray-800"
                disabled={wordCount < currentTaskData.minWords}
              >
                Next Task
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="bg-black hover:bg-gray-800"
                disabled={wordCount < currentTaskData.minWords}
              >
                Submit Test
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
