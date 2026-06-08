/**
 * Typed API layer. All data flows through the backend (no more localStorage
 * stores). Components call these async functions instead of the old sync
 * `*-storage` helpers.
 */
import { api } from "./api-client"
import type {
  Group,
  Student,
  HomeworkAssignment,
  HomeworkSubmission,
  HomeworkAttempt,
  Payment,
  StudentHomeworkEntry,
  StudentProgress,
} from "./admin-storage"
import type { EntryTestSubmission } from "./entry-test-storage"
import type { TestResult } from "./test-results-storage"
import type { ExerciseResultEvent, TopicStat } from "./grammar-analytics"
import type { GrammarExercise } from "./grammar-types"
import type { TopicMeta } from "./grammar-utils"
import type { VocabDeck } from "./vocabulary-data"
import type { StudentLevel } from "./gamification"

// ---------- Auth ----------
export interface AuthUser {
  id: string
  login: string
  email: string
  name: string
  role: "admin" | "teacher" | "student" | "super_admin"
  isPremium: boolean
}
export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export const authApi = {
  login: (login: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { login, password }, false),
  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>("/auth/register", { email, password, name }, false),
  me: () => api.get<{ user: AuthUser }>("/auth/me"),
}

// ---------- Groups ----------
export const groupsApi = {
  list: () => api.get<Group[]>("/groups"),
  get: (id: string) => api.get<Group>(`/groups/${id}`),
  create: (input: Partial<Group>) => api.post<Group>("/groups", input),
  update: (id: string, patch: Partial<Group>) => api.patch<Group>(`/groups/${id}`, patch),
  remove: (id: string) => api.del(`/groups/${id}`),
  addMember: (id: string, studentId: string) =>
    api.post<Group>(`/groups/${id}/members`, { studentId }),
  removeMember: (id: string, studentId: string) =>
    api.del<Group>(`/groups/${id}/members`, { studentId }),
}

// ---------- Students ----------
export const studentsApi = {
  list: () => api.get<Student[]>("/students"),
  get: (id: string) => api.get<Student>(`/students/${id}`),
  loginSuggestions: (name: string) =>
    api.get<string[]>(`/students/login-suggestions?name=${encodeURIComponent(name)}`),
  create: (input: Partial<Student> & { login: string }) =>
    api.post<{
      student: Student
      confirmation: { login: string; code: string; expiresAt: string }
    }>("/students", input),
  regenerateClaim: (id: string) =>
    api.post<{ login: string; code: string; expiresAt: string }>(`/students/${id}/claim`),
  update: (id: string, patch: Partial<Student>) =>
    api.patch<Student>(`/students/${id}`, patch),
  remove: (id: string) => api.del(`/students/${id}`),
  progress: (id: string) => api.get<StudentProgress>(`/students/${id}/progress`),
  level: (id: string) => api.get<StudentLevel>(`/students/${id}/level`),
  context: (id: string) =>
    api.get<{ groupName: string | null; teacherName: string | null }>(
      `/students/${id}/context`,
    ),
}

// ---------- Homework ----------
export const homeworkApi = {
  list: () => api.get<HomeworkAssignment[]>("/homework"),
  get: (id: string) => api.get<HomeworkAssignment>(`/homework/${id}`),
  create: (input: Partial<HomeworkAssignment>) =>
    api.post<HomeworkAssignment>("/homework", input),
  remove: (id: string) => api.del(`/homework/${id}`),
  submissions: (params?: { homeworkId?: string; studentId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<HomeworkSubmission[]>(`/homework/submissions${qs ? `?${qs}` : ""}`)
  },
  grade: (submissionId: string, patch: Partial<HomeworkSubmission>) =>
    api.patch<HomeworkSubmission>(`/homework/submissions/${submissionId}`, patch),
  details: (id: string) =>
    api.get<{
      homework: HomeworkAssignment
      group: Group | null
      students: Student[]
      submissions: HomeworkSubmission[]
    }>(`/homework/${id}/details`),
  mine: () => api.get<StudentHomeworkEntry[]>("/homework/mine"),
  start: (homeworkId: string) =>
    api.post<HomeworkSubmission>("/homework/start", { homeworkId }),
  recordAttempt: (homeworkId: string, attempt: HomeworkAttempt) =>
    api.post<HomeworkSubmission>("/homework/attempt", { homeworkId, attempt }),
}

// ---------- Entry tests ----------
export const entryTestApi = {
  list: () => api.get<EntryTestSubmission[]>("/entry-tests"),
  get: (id: string) => api.get<EntryTestSubmission>(`/entry-tests/${id}`),
  mine: () => api.get<EntryTestSubmission | null>("/entry-tests/mine"),
  assign: (studentId: string) =>
    api.post<EntryTestSubmission>("/entry-tests", { studentId }),
  remove: (id: string) => api.del(`/entry-tests/${id}`),
  saveMc: (id: string, answers: Record<number, string>, completed: boolean) =>
    api.patch<EntryTestSubmission>(`/entry-tests/${id}/mc`, { answers, completed }),
  saveReading: (
    id: string,
    answers: Record<number, number | boolean>,
    completed: boolean,
  ) => api.patch<EntryTestSubmission>(`/entry-tests/${id}/reading`, { answers, completed }),
  saveWritingDraft: (id: string, text: string) =>
    api.patch<EntryTestSubmission>(`/entry-tests/${id}/writing/draft`, { text }),
  submitWriting: (id: string, text: string) =>
    api.patch<EntryTestSubmission>(`/entry-tests/${id}/writing/submit`, { text }),
  grade: (id: string, writingLevel: string, overallLevel: string, feedback?: string) =>
    api.patch<EntryTestSubmission>(`/entry-tests/${id}/grade`, {
      writingLevel,
      overallLevel,
      feedback,
    }),
}

// ---------- Payments ----------
export const paymentsApi = {
  list: (params?: { studentId?: string; groupId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Payment[]>(`/payments${qs ? `?${qs}` : ""}`)
  },
  create: (input: Partial<Payment>) => api.post<Payment>("/payments", input),
  update: (id: string, patch: Partial<Payment>) =>
    api.patch<Payment>(`/payments/${id}`, patch),
  remove: (id: string) => api.del(`/payments/${id}`),
  markPaid: (id: string) => api.post<Payment>(`/payments/${id}/paid`),
  markUnpaid: (id: string) => api.post<Payment>(`/payments/${id}/unpaid`),
  groupSummary: (groupId: string) =>
    api.get<{
      expectedTotal: number
      paidTotal: number
      overdueTotal: number
      pendingTotal: number
    }>(`/payments/group/${groupId}/summary`),
}

// ---------- Analytics ----------
export const analyticsApi = {
  record: (event: Omit<ExerciseResultEvent, "at">) => api.post("/analytics/events", event),
  topics: (studentId?: string) =>
    api.get<TopicStat[]>(`/analytics/topics${studentId ? `?studentId=${studentId}` : ""}`),
}

// ---------- Notifications ----------
export interface NotificationItem {
  id: string
  studentId: string
  type: "homework" | "result" | "reminder" | "achievement" | "system" | "entry_test"
  title: string
  message: string
  read: boolean
  createdAt: string
}
export const notificationsApi = {
  list: () => api.get<NotificationItem[]>("/notifications"),
  markRead: (id: string, read = true) =>
    api.patch<NotificationItem>(`/notifications/${id}/read`, { read }),
  markAllRead: () => api.post("/notifications/read-all"),
}

// ---------- Exercises catalogue ----------
export interface ImportCatalogResult {
  ok: boolean
  topics: { received: number; written: number }
  exercises: { received: number; written: number }
}
export const exercisesApi = {
  list: (topic?: string) =>
    api.get<GrammarExercise[]>(`/exercises${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`),
  topics: () => api.get<TopicMeta[]>("/exercises/topics"),
  get: (slug: string) => api.get<GrammarExercise>(`/exercises/${slug}`),
  import: (payload: { topics: TopicMeta[]; exercises: GrammarExercise[] }) =>
    api.post<ImportCatalogResult>("/exercises/import", payload),
  vocab: () => api.get<VocabDeck[]>("/exercises/vocab"),
  vocabDeck: (slug: string) => api.get<VocabDeck>(`/exercises/vocab/${slug}`),
  importVocab: (decks: VocabDeck[]) =>
    api.post<{ ok: boolean; decksWritten: number }>("/exercises/vocab/import", { decks }),
}

// ---------- Test results ----------
export const testResultsApi = {
  list: () => api.get<TestResult[]>("/test-results"),
  get: (id: string) => api.get<TestResult>(`/test-results/${id}`),
  save: (result: Omit<TestResult, "id">) => api.post<TestResult>("/test-results", result),
}

// ---------- Telegram bot ----------
export interface BotInvite {
  id: string
  code: string
  studentId: string
  createdBy: string
  expiresAt: string
  usedAt: string | null
  parentName: string | null
  createdAt: string
  status: "active" | "used" | "expired"
}
export interface BotSubscriber {
  id: string
  studentId: string
  parentName: string | null
  username: string | null
  phone: string | null
  createdAt: string
}
export interface StudentClaim {
  id: string
  studentId: string
  code: string
  expiresAt: string
  usedAt: string | null
  createdAt: string
  status: "active" | "used" | "expired"
}
export const botApi = {
  listInvites: (studentId?: string) =>
    api.get<BotInvite[]>(`/bot/invites${studentId ? `?studentId=${studentId}` : ""}`),
  createInvite: (studentId: string, ttlHours?: number) =>
    api.post<BotInvite>("/bot/invites", { studentId, ttlHours }),
  revokeInvite: (id: string) => api.del(`/bot/invites/${id}`),
  listSubscribers: (studentId?: string) =>
    api.get<BotSubscriber[]>(`/bot/subscribers${studentId ? `?studentId=${studentId}` : ""}`),
  removeSubscriber: (id: string) => api.del(`/bot/subscribers/${id}`),
  listClaims: (studentId?: string) =>
    api.get<StudentClaim[]>(`/bot/claims${studentId ? `?studentId=${studentId}` : ""}`),
}
