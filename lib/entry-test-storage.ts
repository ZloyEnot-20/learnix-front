/**
 * Client-side storage for placement / entry tests.
 *
 * A teacher assigns an entry test to a student; the student completes three
 * sections (multiple-choice grammar, reading, writing) at their own pace,
 * resuming where they left off. The MC and reading sections are auto-scored;
 * the writing section is graded manually by the teacher.
 */

import {
  ENTRY_MC_QUESTIONS,
  ENTRY_MC_TOTAL,
  ENTRY_READING_QUESTIONS,
  ENTRY_READING_TOTAL,
  mcLevel,
  readingLevel,
} from "./entry-test-content"

export type EntrySectionId = "mc" | "reading" | "writing"

export type EntryTestStatus =
  | "assigned"
  | "in_progress"
  | "awaiting_review"
  | "graded"

export type EntryTestSource = "student" | "phone"

export interface EntryTestSubmission {
  id: string
  studentId?: string
  source?: EntryTestSource
  phone?: string
  studentName: string
  studentEmail?: string
  assignedAt: string
  assignedBy: string
  updatedAt: string

  // Multiple-choice grammar
  mcAnswers: Record<number, string>
  mcCompleted: boolean
  mcScore?: number
  mcLevel?: string

  // Reading
  readingAnswers: Record<number, number | boolean>
  readingCompleted: boolean
  readingScore?: number
  readingLevel?: string

  // Writing (teacher-graded)
  writingText: string
  writingSubmitted: boolean
  writingWordCount?: number
  writingLevel?: string
  writingFeedback?: string

  // Final level set by the teacher across all sections
  overallLevel?: string

  /** Org setting: show demo autocomplete buttons in the entry test UI. */
  entryTestAutocomplete?: boolean

  status: EntryTestStatus
}

const KEY = "entry-tests:v1"

function safeRead(): EntryTestSubmission[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as EntryTestSubmission[]) : []
  } catch {
    return []
  }
}

function safeWrite(list: EntryTestSubmission[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* ignore quota errors */
  }
}

function uid(): string {
  return `entry_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function listEntryTests(): EntryTestSubmission[] {
  return safeRead().sort(
    (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
  )
}

/** The latest active (not graded) entry test for a student, if any. */
export function getActiveEntryTestForStudent(
  studentId: string,
): EntryTestSubmission | undefined {
  return listEntryTests().find((t) => t.studentId === studentId)
}

export function getEntryTest(id: string): EntryTestSubmission | undefined {
  return safeRead().find((t) => t.id === id)
}

export function assignEntryTest(params: {
  studentId: string
  studentName: string
  studentEmail?: string
  assignedBy: string
}): EntryTestSubmission {
  const list = safeRead()
  const now = new Date().toISOString()
  const sub: EntryTestSubmission = {
    id: uid(),
    studentId: params.studentId,
    studentName: params.studentName,
    studentEmail: params.studentEmail,
    assignedAt: now,
    assignedBy: params.assignedBy,
    updatedAt: now,
    mcAnswers: {},
    mcCompleted: false,
    readingAnswers: {},
    readingCompleted: false,
    writingText: "",
    writingSubmitted: false,
    status: "assigned",
  }
  safeWrite([sub, ...list])
  return sub
}

function recomputeStatus(sub: EntryTestSubmission): EntryTestStatus {
  if (sub.writingLevel != null) return "graded"
  if (sub.mcCompleted && sub.readingCompleted && sub.writingSubmitted) {
    return "awaiting_review"
  }
  const started =
    Object.keys(sub.mcAnswers).length > 0 ||
    Object.keys(sub.readingAnswers).length > 0 ||
    sub.writingText.trim().length > 0
  return started ? "in_progress" : "assigned"
}

function patch(id: string, mutate: (s: EntryTestSubmission) => void): void {
  const list = safeRead()
  const idx = list.findIndex((t) => t.id === id)
  if (idx === -1) return
  const next = { ...list[idx] }
  mutate(next)
  next.updatedAt = new Date().toISOString()
  next.status = recomputeStatus(next)
  list[idx] = next
  safeWrite(list)
}

/** Save in-progress MC answers (autosave / resume). */
export function saveMCProgress(
  id: string,
  answers: Record<number, string>,
  completed: boolean,
): void {
  patch(id, (s) => {
    s.mcAnswers = answers
    if (completed) {
      const score = ENTRY_MC_QUESTIONS.reduce(
        (acc, q) => acc + (answers[q.id] === q.correctAnswer ? 1 : 0),
        0,
      )
      s.mcCompleted = true
      s.mcScore = score
      s.mcLevel = mcLevel(score)
    }
  })
}

/** Save in-progress reading answers (autosave / resume). */
export function saveReadingProgress(
  id: string,
  answers: Record<number, number | boolean>,
  completed: boolean,
): void {
  patch(id, (s) => {
    s.readingAnswers = answers
    if (completed) {
      const score = ENTRY_READING_QUESTIONS.reduce(
        (acc, q) => acc + (answers[q.id] === q.correctAnswer ? 1 : 0),
        0,
      )
      s.readingCompleted = true
      s.readingScore = score
      s.readingLevel = readingLevel(score)
    }
  })
}

/** Save writing draft (autosave) without submitting. */
export function saveWritingDraft(id: string, text: string): void {
  patch(id, (s) => {
    s.writingText = text
  })
}

/** Submit the writing task for teacher review. */
export function submitWriting(id: string, text: string): void {
  patch(id, (s) => {
    s.writingText = text
    s.writingSubmitted = true
    s.writingWordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  })
}

/** Teacher grades the writing task with a CEFR level (A1 … B2+). */
export function gradeWriting(
  id: string,
  level: string,
  overallLevel: string,
  feedback?: string,
): void {
  patch(id, (s) => {
    s.writingLevel = level
    s.overallLevel = overallLevel
    s.writingFeedback = feedback?.trim() || undefined
  })
}

export function deleteEntryTest(id: string): void {
  safeWrite(safeRead().filter((t) => t.id !== id))
}

export const ENTRY_TOTALS = {
  mc: ENTRY_MC_TOTAL,
  reading: ENTRY_READING_TOTAL,
}
