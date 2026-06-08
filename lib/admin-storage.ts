// Shared admin/domain types. All data flows through the backend API (see
// `lib/api.ts`); this module only holds the TypeScript shapes that components
// and the API layer import. No mock users or seed data live here.

export type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"

export interface Group {
  id: string
  name: string
  description?: string
  teacherId?: string
  studentIds: string[]
  monthlyFee?: number
  createdAt: string
}

export interface Student {
  id: string
  login: string
  name: string
  email?: string
  phone?: string
  groupId?: string
  joinedAt: string
  monthlyFee?: number
  notes?: string
}

export type HomeworkStatus = "pending" | "in_progress" | "paused" | "submitted" | "graded"

export interface HomeworkAssignment {
  id: string
  title: string
  description: string
  subject: Subject
  groupId: string
  dueAt: string
  estimatedMinutes: number
  createdAt: string
  createdBy: string
  /** Optional reference to a grammar/vocab exercise by slug. */
  exerciseSlug?: string
  /** Countdown limit in minutes for the student. Undefined = unlimited. */
  timeLimitMinutes?: number
}

export interface HomeworkMistake {
  questionId: number
  prompt: string
  userAnswer: string
  correctAnswer: string
  explanation?: string
}

export interface HomeworkAttempt {
  totalQuestions: number
  correctCount: number
  durationSeconds?: number
  failedDueToCheating?: boolean
  cheatingReason?: string
  mistakes: HomeworkMistake[]
  /** True when the student ran out of time before finishing all questions. */
  timedOut?: boolean
  /** How many questions the student actually reached before time ran out. */
  answeredCount?: number
}

export interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  status: HomeworkStatus
  score?: number
  /** When the student opened/began the exercise. */
  startedAt?: string
  submittedAt?: string
  feedback?: string
  attempt?: HomeworkAttempt
  integrityStatus?: "ok" | "cheating_suspicion" | "cheating_detected"
  pausedAt?: string
  pauseUsed?: boolean
}

export type PaymentStatus = "pending" | "paid" | "overdue"

export interface Payment {
  id: string
  studentId: string
  groupId: string
  amount: number
  periodLabel: string
  dueDate: string
  paidDate?: string
  status: PaymentStatus
  notes?: string
}

export interface StudentHomeworkEntry {
  homework: HomeworkAssignment
  submission: HomeworkSubmission
}

export interface StudentProgress {
  totalHomework: number
  completedHomework: number
  pendingHomework: number
  averageScore: number | null
  upcomingPayment?: Payment
  unpaidTotal: number
  paidTotal: number
}
