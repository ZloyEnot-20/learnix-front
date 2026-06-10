// Shared admin/domain types. All data flows through the backend API (see
// `lib/api.ts`); this module only holds the TypeScript shapes that components
// and the API layer import. No mock users or seed data live here.

export type Subject = "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary"

export interface Group {
  id: string
  name: string
  description?: string
  teacherId?: string
  /** Computed by the API from User.groupId; prefer `studentsInGroup()` when students are loaded. */
  studentIds: string[]
  monthlyFee?: number
  createdAt: string
}

/** Group members — canonical membership is Student.groupId (User collection). */
export function studentsInGroup(students: Student[], groupId: string): Student[] {
  return students.filter((s) => s.groupId === groupId)
}

export function groupMemberCount(students: Student[], groupId: string): number {
  return studentsInGroup(students, groupId).length
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

export type StaffType = "super_admin" | "admin" | "teacher"

/** @deprecated Use StaffType */
export type StaffType = StaffType

export interface StaffUser {
  id: string
  login: string
  email: string
  name: string
  type: StaffType
  isPremium?: boolean
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

export type ControlWorkSubject = "vocabulary" | "grammar" | "reading" | "listening" | "writing"

export interface ControlWorkStep {
  subject: ControlWorkSubject
  title: string
  exerciseSlug?: string
  deckSlug?: string
  testId?: string
  topic?: string
}

export interface ControlWork {
  id: string
  title: string
  description: string
  groupId: string
  dueAt: string
  timeLimitMinutes?: number
  createdBy: string
  createdAt: string
  steps: ControlWorkStep[]
}

export interface ControlWorkStepResult {
  stepIndex: number
  status: "pending" | "completed"
  attempt?: HomeworkAttempt
  submittedAt?: string
}

export interface ControlWorkSubmission {
  id: string
  controlWorkId: string
  studentId: string
  status: HomeworkStatus
  currentStep: number
  stepResults: ControlWorkStepResult[]
  score?: number
  startedAt?: string
  submittedAt?: string
  feedback?: string
  integrityStatus?: "ok" | "cheating_suspicion" | "cheating_detected"
  pausedAt?: string
  pauseUsed?: boolean
}

export interface StudentControlWorkEntry {
  controlWork: ControlWork
  submission: ControlWorkSubmission
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
