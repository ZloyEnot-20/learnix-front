export interface TestResult {
  id: string
  testType: "reading" | "listening" | "writing" | "speaking"
  date: string
  bandScore: number
  totalCorrect: number
  totalQuestions: number
  answers: Record<number, string>
  parts: Array<{
    partNumber: number
    questions: Array<{
      id: number
      correctAnswer: string
    }>
  }>
}

const STORAGE_KEY = "ielts_test_results"

export function saveTestResult(result: TestResult): void {
  try {
    const existingResults = getTestResults()
    const updatedResults = [result, ...existingResults]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedResults))
  } catch (error) {
    console.error("Failed to save test result:", error)
  }
}

export function getTestResults(): TestResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Failed to load test results:", error)
    return []
  }
}

export function getTestResultById(id: string): TestResult | null {
  const results = getTestResults()
  return results.find((result) => result.id === id) || null
}
