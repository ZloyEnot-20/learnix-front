/**
 * Typed API layer. All data flows through the backend (no more localStorage
 * stores). Components call these async functions instead of the old sync
 * `*-storage` helpers.
 */
import { api, apiUpload } from "./api-client"
import type { PodcastEpisode } from "./podcast-data"
import type {
  Group,
  Student,
  HomeworkAssignment,
  HomeworkSubmission,
  HomeworkAttempt,
  Payment,
  LessonSession,
  AttendanceRecord,
  AttendanceStatus,
  StudentHomeworkEntry,
  StudentProgress,
  ControlWork,
  ControlWorkSubject,
  ControlWorkSubmission,
  StudentControlWorkEntry,
  StaffUser,
  StaffType,
} from "./admin-storage"
import type { EntryTestSubmission } from "./entry-test-storage"
import type { StudentNotificationType } from "./notification-types"
import type { TestResult } from "./test-results-storage"
import type { ExerciseResultEvent, TopicStat } from "./grammar-analytics"
import type { GrammarExercise } from "./grammar-types"
import type { TopicMeta } from "./grammar-utils"
import type { VocabDeck } from "./vocabulary-data"
import type { StudentLevel } from "./gamification"
import type { StudentContextResponse } from "./lesson-schedule"

// ---------- Auth ----------
export interface AuthUser {
  id: string
  orgId?: string | null
  login: string
  email: string
  name: string
  type: "admin" | "teacher" | "student" | "super_admin"
  isPremium: boolean
  avatarUrl?: string | null
}
export type OrgStatus = "active" | "blocked" | null
export interface AuthResponse {
  user: AuthUser
  orgStatus: OrgStatus
  accessToken: string
  refreshToken: string
}

export const authApi = {
  login: (login: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { login, password }, false),
  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>("/auth/register", { email, password, name }, false),
  me: () => api.get<{ user: AuthUser; orgStatus: OrgStatus }>("/auth/me"),
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
  context: (id: string) => api.get<StudentContextResponse>(`/students/${id}/context`),
  ieltsProfile: (id: string) => api.get<StudentIeltsProfile>(`/students/${id}/ielts-profile`),
  ieltsSummaries: () => api.get<StudentIeltsSummary[]>("/students/ielts-summaries"),
  languageProfile: (id: string, force?: boolean) =>
    api.get<StudentLanguageProfile>(
      `/students/${id}/language-profile${force ? "?force=true" : ""}`,
    ),
  languageProfileSummaries: () =>
    api.get<StudentLanguageProfileSummary[]>("/students/language-profile-summaries"),
  languageProfileLevelCatalogue: () =>
    api.get<LearnixLevelCatalogueEntry[]>("/students/language-profile/level-catalogue"),
  recomputeLanguageProfile: (id: string) =>
    api.post<StudentLanguageProfile>(`/students/${id}/language-profile/recompute`),
  languageProfileDebug: (id: string) =>
    api.get<LanguageProfileDebugResponse>(`/students/${id}/language-profile/debug`),
  languageProfileHistory: (id: string) =>
    api.get<LanguageProfileHistory>(`/students/${id}/language-profile/history`),
  recommendedHomework: (id: string) =>
    api.get<RecommendedHomeworkResponse>(`/students/${id}/recommended-homework`),
  sendNotification: (
    id: string,
    input: { title: string; message: string; type: StudentNotificationType },
  ) => api.post<NotificationItem>(`/students/${id}/notify`, input),
}

export type IeltsReadinessStatus =
  | "ready"
  | "on_track"
  | "at_risk"
  | "not_ready"
  | "insufficient_data"

export interface StudentIeltsSkill {
  skill: string
  estimatedBand: number | null
  source: "mock_test" | "homework" | "none"
  attempts: number
  lastBand: number | null
  trend: "up" | "down" | "stable"
  belowTarget: boolean
}

export interface StudentIeltsProfile {
  targetBand: number | null
  targetExamDate: string | null
  overallBand: number | null
  gapToTarget: number | null
  readinessStatus: IeltsReadinessStatus
  estimatedReadyDate: string | null
  confidence: "high" | "medium" | "low"
  daysToExam: number | null
  skills: StudentIeltsSkill[]
  learningHealth: {
    completionRate: number | null
    avgAccuracy: number | null
    cheatingIncidents: number
    weakestTopics: Array<{ topic: string; accuracy: number | null }>
    entryLevel: string | null
  }
  bandHistory: Array<{ date: string; skill: string; band: number }>
  recommendation: string
}

export interface StudentIeltsSummary {
  studentId: string
  overallBand: number | null
  readinessStatus: IeltsReadinessStatus
  targetExamDate: string | null
  targetBand: number | null
}

export interface LanguageTopicStat {
  slug: string
  title: string
  attemptedQuestions: number
  correctAnswers: number
  totalAttempts: number
  firstAttemptAt?: string
  lastAttemptAt?: string
  accuracy: number
  weightedAccuracy: number
  confidence: number
  learnixLevel?: number
  mastered: boolean
  needsReview: boolean
}

export interface LanguageSkillProfile {
  score: number
  confidence: number
  level: number
  topics: LanguageTopicStat[]
  hasData: boolean
  dimensions?: {
    grammar: number
    vocabulary: number
    fluency: number
    pronunciation: number
  }
}

export interface StudentLanguageProfile {
  studentId: string
  orgId: string
  grammar: LanguageSkillProfile
  vocabulary: LanguageSkillProfile
  speaking: LanguageSkillProfile
  reading: LanguageSkillProfile
  listening: LanguageSkillProfile
  writing: LanguageSkillProfile
  overall: {
    score: number
    level: number
    confidence: number
  }
  coverage: {
    attemptedTopics: number
    masteredTopics: number
    totalTopics: number
    needsReviewTopics: number
  }
  masteredTopics: string[]
  needsReviewTopics: string[]
  levelCoverage: Record<string, number>
  recommendations: LanguageRecommendation[]
  lastComputedAt: string
  version: number
}

export interface LanguageRecommendation {
  type: string
  skill?: string
  topic?: string
  title?: string
  priority: "high" | "medium" | "low"
  reason?: string
}

export interface LanguageScoreHistoryPoint {
  date: string
  score: number
  level: number
}

export interface LanguageProfileHistory {
  grammar: LanguageScoreHistoryPoint[]
  vocabulary: LanguageScoreHistoryPoint[]
  speaking: LanguageScoreHistoryPoint[]
  overall: LanguageScoreHistoryPoint[]
}

export interface LanguageProfileSkillDebug {
  rawScore: number
  avgConfidence?: number
  breadthFactor?: number
  masteryFactor?: number
  masteryBonus?: number
  eligibleTopics?: number
  masteredTopics?: number
  finalScore: number
  level?: number
}

export interface LanguageProfileVocabularySourceDebug {
  source: string
  events: number
  questions: number
  scoreIfOnlySource: number
  rawScoreIfOnlySource: number
  eligibleTopics: number
}

export interface LanguageProfileOverallDebug {
  rawScore: number
  breadthPenalty: number
  levelPenalty: number
  finalScore: number
  level: number
  confidence: number
  attemptedTopics: number
  totalTopics: number
}

export interface LanguageProfileDebugResponse {
  grammar: LanguageProfileSkillDebug
  vocabulary: LanguageProfileSkillDebug & { sources: LanguageProfileVocabularySourceDebug[] }
  speaking: { rawScore: number; confidence: number; finalScore: number; level: number; approvedAssessments: number }
  overall: LanguageProfileOverallDebug
  meta: { computedAt: string; levelCoverage: Record<string, number> }
}

export interface HomeworkCandidate {
  kind: string
  subject: string
  exerciseSlug: string
  title: string
  topic: string
  level?: string
  difficulty?: string
  totalQuestions?: number
  priority: "high" | "medium" | "low"
  reason: string
}

export interface RecommendedHomeworkResponse {
  recommendations: LanguageRecommendation[]
  homeworkCandidates: HomeworkCandidate[]
}

export interface StudentLanguageProfileSummary {
  studentId: string
  overallScore: number | null
  learnixLevel: number | null
  confidence: number | null
  grammarScore: number | null
  vocabularyScore: number | null
  speakingScore: number | null
  hasData: boolean
}

export interface LearnixLevelCatalogueEntry {
  level: number
  cefr: string
  title: string
  description: string
  grammarTopics: { slug: string; title: string }[]
  vocabularyCefr: string
}

// ---------- Staff users (org admin) ----------
export const usersApi = {
  list: () => api.get<StaffUser[]>("/users"),
  get: (id: string) => api.get<StaffUser>(`/users/${id}`),
  create: (input: { name: string; login: string; email?: string; type: StaffType }) =>
    api.post<{ user: StaffUser; temporaryPassword: string }>("/users", input),
  update: (id: string, patch: Partial<Pick<StaffUser, "name" | "login" | "email" | "type">>) =>
    api.patch<StaffUser>(`/users/${id}`, patch),
  updatePermissions: (id: string, permissions: string[]) =>
    api.patch<StaffUser>(`/users/${id}/permissions`, { permissions }),
  resetPassword: (id: string) =>
    api.post<{ login: string; temporaryPassword: string }>(`/users/${id}/reset-password`),
  remove: (id: string) => api.del(`/users/${id}`),
}

// ---------- Audit logs (org admin) ----------
export interface AuditLogEntry {
  id: string
  action: string
  category: string
  actorId: string | null
  actorName: string
  actorType: string | null
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditLogListResponse {
  items: AuditLogEntry[]
  total: number
  page: number
  limit: number
  pages: number
}

export const auditApi = {
  list: (params?: {
    page?: number
    limit?: number
    category?: string
    action?: string
    search?: string
    from?: string
    to?: string
  }) => {
    const qs = new URLSearchParams()
    if (params?.page) qs.set("page", String(params.page))
    if (params?.limit) qs.set("limit", String(params.limit))
    if (params?.category) qs.set("category", params.category)
    if (params?.action) qs.set("action", params.action)
    if (params?.search) qs.set("search", params.search)
    if (params?.from) qs.set("from", params.from)
    if (params?.to) qs.set("to", params.to)
    const q = qs.toString()
    return api.get<AuditLogListResponse>(`/audit${q ? `?${q}` : ""}`)
  },
  meta: () => api.get<{ categories: string[]; actions: string[] }>("/audit/meta"),
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
  /** Homework check tab — assignments + all student records from Submission collection. */
  check: () =>
    api.get<{ assignments: HomeworkAssignment[]; records: HomeworkSubmission[] }>(
      "/homework/check",
    ),
  grade: (
    submissionId: string,
    patch: Partial<HomeworkSubmission> & {
      recordingGrades?: Array<{
        questionId: number
        score?: number
        feedback?: string
      }>
    },
  ) => api.patch<HomeworkSubmission>(`/homework/submissions/${submissionId}`, patch),
  transcribe: (submissionId: string) =>
    api.post<HomeworkSubmission>(`/homework/submissions/${submissionId}/transcribe`),
  retry: (submissionId: string) =>
    api.post<HomeworkSubmission>(`/homework/submissions/${submissionId}/retry`),
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

// ---------- Progress tests (unit tests) ----------
export const controlWorkApi = {
  list: () => api.get<ControlWork[]>("/control-works"),
  get: (id: string) => api.get<ControlWork>(`/control-works/${id}`),
  create: (input: {
    title: string
    description?: string
    groupId: string
    dueAt: string
    timeLimitMinutes?: number
    createdBy?: string
    sectionOrder: ControlWorkSubject[]
    sections: Partial<
      Record<
        ControlWorkSubject,
        {
          mode?: "manual" | "mix"
          topicSlugs?: string[]
          exerciseSlugs?: string[]
          deckSlugs?: string[]
          mixCount?: number
          testId?: string
          testTitle?: string
        }
      >
    >
  }) => api.post<ControlWork>("/control-works", input),
  remove: (id: string) => api.del(`/control-works/${id}`),
  submissions: (params?: { controlWorkId?: string; studentId?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<ControlWorkSubmission[]>(
      `/control-works/submissions${qs ? `?${qs}` : ""}`,
    )
  },
  mine: () => api.get<StudentControlWorkEntry[]>("/control-works/mine"),
  start: (controlWorkId: string) =>
    api.post<ControlWorkSubmission>("/control-works/start", { controlWorkId }),
  completeStep: (controlWorkId: string, stepIndex: number, attempt: HomeworkAttempt) =>
    api.post<ControlWorkSubmission>("/control-works/step", {
      controlWorkId,
      stepIndex,
      attempt,
    }),
}

// ---------- Entry tests ----------
export const entryTestApi = {
  list: (source?: "student" | "phone") =>
    api.get<EntryTestSubmission[]>(
      source ? `/entry-tests?source=${source}` : "/entry-tests",
    ),
  get: (id: string) => api.get<EntryTestSubmission>(`/entry-tests/${id}`),
  mine: () => api.get<EntryTestSubmission | null>("/entry-tests/mine"),
  assign: (studentId: string) =>
    api.post<EntryTestSubmission>("/entry-tests", { studentId }),
  registerCandidate: (input: {
    name: string
    phone: string
    login?: string
    email?: string
    notes?: string
  }) =>
    api.post<{
      student: Student
      entryTest: EntryTestSubmission
      group: { id: string; name: string }
      confirmation: { login: string; code: string; expiresAt: string }
    }>("/entry-tests/register", input),
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

/** Public entry test access by phone (no login). */
export const entryTestPublicApi = {
  lookup: (phone: string, orgId?: string) =>
    api.post<EntryTestSubmission>(
      "/entry-tests/public/lookup",
      { phone, ...(orgId ? { orgId } : {}) },
      false,
    ),
  saveMc: (
    id: string,
    phone: string,
    answers: Record<number, string>,
    completed: boolean,
  ) =>
    api.patch<EntryTestSubmission>(
      `/entry-tests/public/${id}/mc`,
      { phone, answers, completed },
      false,
    ),
  saveReading: (
    id: string,
    phone: string,
    answers: Record<number, number | boolean>,
    completed: boolean,
  ) =>
    api.patch<EntryTestSubmission>(
      `/entry-tests/public/${id}/reading`,
      { phone, answers, completed },
      false,
    ),
  saveWritingDraft: (id: string, phone: string, text: string) =>
    api.patch<EntryTestSubmission>(
      `/entry-tests/public/${id}/writing/draft`,
      { phone, text },
      false,
    ),
  submitWriting: (id: string, phone: string, text: string) =>
    api.patch<EntryTestSubmission>(
      `/entry-tests/public/${id}/writing/submit`,
      { phone, text },
      false,
    ),
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
  markPaid: (id: string, paidAmount?: number) =>
    api.post<Payment>(`/payments/${id}/paid`, paidAmount != null ? { paidAmount } : undefined),
  markUnpaid: (id: string) => api.post<Payment>(`/payments/${id}/unpaid`),
  groupSummary: (groupId: string) =>
    api.get<{
      expectedTotal: number
      paidTotal: number
      overdueTotal: number
      pendingTotal: number
    }>(`/payments/group/${groupId}/summary`),
}

// ---------- Lessons & attendance ----------
export const lessonsApi = {
  list: (params: { groupId: string; month?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v != null && v !== ""),
      ) as Record<string, string>,
    ).toString()
    return api.get<LessonSession[]>(`/lessons?${qs}`)
  },
  get: (id: string) => api.get<LessonSession>(`/lessons/${id}`),
  create: (input: {
    groupId: string
    date: string
    topic?: string
    notes?: string
  }) => api.post<LessonSession>("/lessons", input),
  update: (
    id: string,
    patch: {
      topic?: string
      notes?: string
      canceled?: boolean
      cancelReason?: string
      attendance?: AttendanceRecord[]
    },
  ) => api.patch<LessonSession>(`/lessons/${id}`, patch),
  remove: (id: string, options?: { scope?: "single" | "weekday-future" }) => {
    const scope = options?.scope ?? "single"
    const qs = scope === "single" ? "" : `?scope=${scope}`
    return api.del<{ ok: boolean; deletedCount: number }>(`/lessons/${id}${qs}`)
  },
}

export type { AttendanceStatus, AttendanceRecord, LessonSession }

// ---------- Analytics ----------
export interface StudentActivityItem {
  id: string
  studentId: string
  eventType: string
  category: string
  source: string
  subject: string | null
  contextId: string | null
  contextLabel: string | null
  materialSlug: string | null
  materialTitle: string | null
  correctCount: number | null
  totalQuestions: number | null
  score: number | null
  accuracy: number | null
  durationSeconds: number | null
  timedOut: boolean
  failedDueToCheating: boolean
  metadata: Record<string, unknown> | null
  at: string
}

export interface StudentAnalyticsSummary {
  integrity: {
    violations: number
    cheatingIncidents: number
    byReason: Record<string, number>
  }
  homework: {
    completed: number
    cheating: number
    failed?: number
    byTopic?: Array<{
      topic: string
      assigned: number
      completed: number
      failed: number
      cheating: number
      totalEntries: number
    }>
    assignments?: Array<{
      homeworkId: string
      homeworkTitle?: string
      topic?: string
      status: string
      integrityStatus: string
      failedDueToCheating: boolean
      entryCount: number
      score: number | null
      assignedAt?: string
      submittedAt?: string
    }>
  }
  controlWorks: { completed: number; cheating: number }
  bySubject: Array<{
    subject: string
    attempts: number
    accuracy: number | null
    avgScore: number | null
  }>
  grammarByTopic: Array<{
    topic: string
    attempts: number
    correct: number
    total: number
    accuracy: number | null
  }>
  vocabulary: {
    wordsLearned: number
    deckAttempts: number
    byDeck: Array<{
      deckSlug: string
      deckTitle: string
      attempts: number
      correct: number
      total: number
      accuracy: number | null
    }>
  }
  mockTests: Array<{ testType: string; count: number; avgBand: number | null }>
  recentActivity: Array<{
    id: string
    eventType: string
    category: string
    subject: string | null
    contextLabel: string | null
    materialTitle: string | null
    accuracy: number | null
    at: string
  }>
}

export interface ExerciseAnalyticsRow {
  slug: string
  title: string
  topic: string | null
  subtopic: string | null
  type: string | null
  level: string | null
  subject: string
  assigned: number
  started: number
  completed: number
  inProgress: number
  pending: number
  paused: number
  cheating: number
  failed: number
  suspicion: number
  timedOut: number
  practiceAttempts: number
  practiceTimeouts: number
  completionRate: number | null
  startedRate: number | null
  cheatingRate: number | null
  failureRate: number | null
  suspicionRate: number | null
  practiceAccuracy: number | null
  avgScore: number | null
}

export interface ExerciseAnalyticsReport {
  summary: {
    exercisesTracked: number
    totalAssigned: number
    totalCompleted: number
    totalCheating: number
    totalFailed: number
    totalPracticeAttempts: number
    completionRate: number | null
    cheatingRate: number | null
    failureRate: number | null
    weakestExercise: ExerciseAnalyticsRow | null
    mostCheatingExercise: ExerciseAnalyticsRow | null
  }
  exercises: ExerciseAnalyticsRow[]
  topics: Array<{
    topic: string
    label: string
    assigned: number
    completed: number
    cheating: number
    failed: number
    practiceAttempts: number
    completionRate: number | null
    cheatingRate: number | null
    failureRate: number | null
    exercises: ExerciseAnalyticsRow[]
  }>
}

export const analyticsApi = {
  record: (event: Omit<ExerciseResultEvent, "at"> & {
    source?: "game" | "homework" | "control_work"
    homeworkId?: string
    controlWorkId?: string
    durationSeconds?: number
  }) => api.post("/analytics/events", event),
  recordVocab: (input: {
    deckSlug: string
    deckTitle: string
    correct: number
    total: number
    source?: "game" | "homework"
    totalWords?: number
    wordAnswers?: Array<{
      term: string
      correct: boolean
      interactionType?: string
      deckSlug?: string
    }>
    words?: Array<{ term: string; partOfSpeech?: string; definition?: string; deckSlug?: string; deckTitle?: string }>
  }) => api.post("/analytics/vocab", input),
  recordVocabWord: (input: {
    term: string
    deckSlug: string
    correct: boolean
    interactionType?: string
  }) => api.post("/analytics/vocab/word", input),
  syncLearn: (input: {
    studyWords?: Array<{
      term: string
      deckSlug: string
      correctCount?: number
      totalAttempts?: number
      masteredAt?: string
      wantToLearn?: boolean
      lastReviewedAt?: string
    }>
    vocabResults?: Array<{
      deckSlug: string
      deckTitle?: string
      correct: number
      total: number
      completedAt?: string
    }>
  }) => api.post("/analytics/learn/sync", input),
  learnProgress: (studentId?: string) =>
    api.get(`/analytics/learn/progress${studentId ? `/${studentId}` : ""}`),
  vocabWordStats: (params?: { deckSlug?: string; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.deckSlug) qs.set("deckSlug", params.deckSlug)
    if (params?.limit) qs.set("limit", String(params.limit))
    const q = qs.toString()
    return api.get(`/analytics/vocab/words/stats${q ? `?${q}` : ""}`)
  },
  vocabDeckStats: (params?: { limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.limit) qs.set("limit", String(params.limit))
    const q = qs.toString()
    return api.get(`/analytics/vocab/decks/stats${q ? `?${q}` : ""}`)
  },
  topics: (studentId?: string) =>
    api.get<TopicStat[]>(`/analytics/topics${studentId ? `?studentId=${studentId}` : ""}`),
  exerciseStats: () => api.get<ExerciseAnalyticsReport>("/analytics/exercises"),
  activity: (params?: {
    studentId?: string
    page?: number
    limit?: number
    category?: string
    eventType?: string
  }) => {
    const qs = new URLSearchParams()
    if (params?.studentId) qs.set("studentId", params.studentId)
    if (params?.page) qs.set("page", String(params.page))
    if (params?.limit) qs.set("limit", String(params.limit))
    if (params?.category) qs.set("category", params.category)
    if (params?.eventType) qs.set("eventType", params.eventType)
    const q = qs.toString()
    return api.get<{
      items: StudentActivityItem[]
      total: number
      page: number
      limit: number
      pages: number
    }>(`/analytics/activity${q ? `?${q}` : ""}`)
  },
  summary: (studentId?: string) =>
    api.get<StudentAnalyticsSummary>(
      studentId ? `/analytics/students/${studentId}/summary` : "/analytics/summary",
    ),
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

// ---------- Organization (subscription & platform messages) ----------
export interface OrgAnnouncement {
  id: string
  title: string
  message: string
  type: "news" | "maintenance"
  severity: "info" | "warning" | "critical"
  startsAt: string
  endsAt: string | null
}

export interface OrgBillingInfo {
  organization: {
    id: string
    name: string
    subdomain: string
    status: "active" | "blocked"
    plan: "free" | "pro"
    limits: { maxStudents: number; maxTeachers: number }
    trialEndsAt: string | null
  }
  subscription: {
    id: string
    plan: "free" | "pro"
    status: "trialing" | "active" | "past_due" | "canceled"
    trialEndsAt: string | null
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    canceledAt: string | null
  } | null
  payments: Array<{
    id: string
    amount: number
    currency: string
    status: "pending" | "paid" | "failed" | "refunded"
    periodLabel: string
    paidAt: string | null
    createdAt: string
  }>
}

export interface OrgSettings {
  allowScreenshots: boolean
  /** Off unless explicitly enabled in organization settings. */
  entryTestAutocomplete?: boolean
}

export const orgApi = {
  banner: () => api.get<OrgAnnouncement[]>("/org/banner"),
  billing: () => api.get<OrgBillingInfo>("/org/billing"),
  settings: () => api.get<OrgSettings>("/org/settings"),
  updateSettings: (body: Partial<OrgSettings>) => api.patch<OrgSettings>("/org/settings", body),
}

// ---------- Exercises catalogue ----------
export interface ImportCatalogResult {
  ok: boolean
  topics: { received: number; written: number }
  exercises: { received: number; written: number }
}

export interface VocabDeckSummary {
  slug: string
  title: string
  description: string
  level: string
  topic?: string
  difficulty?: "easy" | "medium" | "hard"
  orgId?: string | null
  wordCount: number
}

export interface ManageVocabPayload {
  mode: "create" | "append"
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  difficulty?: "easy" | "medium" | "hard"
  topic?: string
  deckSlug?: string
  title?: string
  words: Array<{
    term: string
    definition: string
    translation?: string
    translationUz?: string
    partOfSpeech?: string
  }>
}

export interface SpeakingSetSummary {
  slug: string
  title: string
  level: string
  questionCount: number
}

export interface ManageSpeakingPayload {
  mode: "create" | "append"
  level?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  title?: string
  exerciseSlug?: string
  prompts: Array<{
    text: string
    hint?: string
    explanation?: string
  }>
}
export const exercisesApi = {
  list: (topic?: string) =>
    api.get<GrammarExercise[]>(`/exercises${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`),
  topics: () => api.get<TopicMeta[]>("/exercises/topics"),
  get: (slug: string) => api.get<GrammarExercise>(`/exercises/${slug}`),
  import: (payload: { topics: TopicMeta[]; exercises: GrammarExercise[] }) =>
    api.post<ImportCatalogResult>("/exercises/import", payload),
  vocab: () => api.get<VocabDeck[]>("/exercises/vocab"),
  orgVocabDecks: () => api.get<VocabDeckSummary[]>("/exercises/vocab/org"),
  vocabDeck: (slug: string) => api.get<VocabDeck>(`/exercises/vocab/${slug}`),
  manageVocab: (payload: ManageVocabPayload) =>
    api.post<{ ok: boolean; deck: VocabDeck; wordsAdded: number }>(
      "/exercises/vocab/manage",
      payload,
    ),
  orgSpeakingSets: () => api.get<SpeakingSetSummary[]>("/exercises/speaking/org"),
  manageSpeaking: (payload: ManageSpeakingPayload) =>
    api.post<{ ok: boolean; exercise: GrammarExercise; promptsAdded: number }>(
      "/exercises/speaking/manage",
      payload,
    ),
  importVocab: (decks: VocabDeck[]) =>
    api.post<{ ok: boolean; decksWritten: number }>("/exercises/vocab/import", { decks }),
  podcasts: () => api.get<PodcastEpisode[]>("/exercises/podcasts"),
  podcast: (slug: string) => api.get<PodcastEpisode>(`/exercises/podcasts/${slug}`),
  importPodcasts: (podcasts: PodcastEpisode[]) =>
    api.post<{ ok: boolean; podcastsWritten: number }>("/exercises/podcasts/import", { podcasts }),
  uploadPodcast: (form: FormData) =>
    apiUpload<{ ok: boolean; podcast: PodcastEpisode }>("/exercises/podcasts/upload", form),
  readingSummaries: () =>
    api.get<
      {
        slug: string
        title: string
        subtitle: string
        totalTimeMinutes: number
        questionCount: number
        questionTypes?: string[]
        order?: number
      }[]
    >("/exercises/reading/summary"),
  reading: (slug: string) =>
    api.get<{
      slug: string
      title: string
      totalTimeMinutes: number
      questionCount: number
      data: {
        id: string
        title: string
        totalTimeMinutes: number
        parts: unknown[]
      }
    }>(`/exercises/reading/${slug}`),
}

// ---------- Uploads ----------
export const uploadsApi = {
  speakingAudio: (blob: Blob) => {
    const form = new FormData()
    const ext = blob.type.includes("mp4") ? "m4a" : "webm"
    form.append("audio", blob, `speaking-${Date.now()}.${ext}`)
    return apiUpload<{ url: string; key: string }>("/uploads/speaking-audio", form)
  },
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

export interface SpeechServiceStatus {
  configured: boolean
  serviceUrl: string
  model: string
  language: string
  online: boolean
  loaded: boolean
  status: string
  error: string | null
}

export const speechApi = {
  status: () => api.get<SpeechServiceStatus>("/speech/status"),
  test: (url: string) => api.post<{ text: string; language: string }>("/speech/test", { url }),
}
