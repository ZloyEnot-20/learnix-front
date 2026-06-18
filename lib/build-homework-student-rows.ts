import type { HomeworkStatus, HomeworkSubmission, Student } from "./admin-storage"
import {
  recordingGradesFromMistakes,
  type RecordingGradeDraft,
} from "@/components/admin/speaking-recording-review"

export interface HomeworkStudentRow {
  studentId: string
  studentName: string
  submission?: HomeworkSubmission
  status: HomeworkStatus
  score: string
  feedback: string
  recordingGrades: RecordingGradeDraft[]
  dirty: boolean
}

function rowFromSubmission(
  studentId: string,
  studentName: string,
  sub?: HomeworkSubmission,
): HomeworkStudentRow {
  return {
    studentId,
    studentName,
    submission: sub,
    status: (sub?.status ?? "pending") as HomeworkStatus,
    score: sub?.score != null ? String(sub.score) : "",
    feedback: sub?.feedback ?? "",
    recordingGrades: recordingGradesFromMistakes(sub?.attempt?.mistakes ?? []),
    dirty: false,
  }
}

/** Group members plus any student with a submission record (e.g. former members). */
export function buildHomeworkStudentRows(
  students: Student[],
  submissions: HomeworkSubmission[],
  groupId: string,
): HomeworkStudentRow[] {
  const members = students.filter((s) => s.groupId === groupId)
  const studentById = new Map(students.map((s) => [s.id, s]))
  const submissionByStudent = new Map(submissions.map((s) => [s.studentId, s]))
  const seen = new Set<string>()

  const rows: HomeworkStudentRow[] = members.map((student) => {
    seen.add(student.id)
    return rowFromSubmission(student.id, student.name, submissionByStudent.get(student.id))
  })

  for (const sub of submissions) {
    if (seen.has(sub.studentId)) continue
    const student = studentById.get(sub.studentId)
    rows.push(
      rowFromSubmission(
        sub.studentId,
        student?.name ?? `Student · ${sub.studentId.slice(-6)}`,
        sub,
      ),
    )
  }

  return rows
}

export function hasSubmissionResults(sub?: HomeworkSubmission): boolean {
  if (!sub) return false
  const attempt = sub.attempt
  if (attempt) {
    return (
      (attempt.totalQuestions ?? 0) > 0 ||
      (attempt.mistakes?.length ?? 0) > 0 ||
      attempt.timedOut ||
      attempt.failedDueToCheating ||
      typeof attempt.answeredCount === "number" ||
      !!attempt.listeningStats?.completedListening
    )
  }
  return sub.status === "submitted" || sub.status === "graded"
}
