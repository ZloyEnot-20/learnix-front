import type { LiveLessonState, LiveLessonStatus, LiveStudentProgress } from "@/lib/books/types"
import { api } from "./api-client"

export interface LiveBookSummary {
  id: string
  bookId?: string
  title: string
  author?: string | null
  year?: number | null
  unitCount: number
  readyUnitCount?: number
}

export type { LiveLessonState, LiveLessonStatus, LiveStudentProgress }

export const liveLessonsApi = {
  listBooks: () => api.get<LiveBookSummary[]>("/live-lessons/books"),
  getBook: (bookId: string) =>
    api.get<{
      bookId: string
      book: { title: string; author?: string; year?: number }
      units: Array<{
        unit_number: number
        title: string
        subtitle?: string | null
        ready?: boolean
        exerciseIds: string[]
      }>
      answer_key?: Record<string, unknown>
    }>(`/live-lessons/books/${bookId}`),
  getUnit: (bookId: string, unitNumber: number) =>
    api.get<{
      bookId: string
      book: unknown
      unit: unknown
      exerciseIds: string[]
      answer_key?: Record<string, unknown> | null
    }>(`/live-lessons/books/${bookId}/units/${unitNumber}`),
  create: (input: { groupId: string; bookId: string; unitNumber?: number }) =>
    api.post<LiveLessonState>("/live-lessons", input),
  get: (id: string) => api.get<LiveLessonState>(`/live-lessons/${id}`),
  start: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/start`),
  pause: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/pause`),
  resume: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/resume`),
  finish: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/finish`),
  assignUnit: (id: string, unitNumber: number) =>
    api.post<LiveLessonState>(`/live-lessons/${id}/assign-unit`, { unitNumber }),
  completeUnit: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/complete-unit`),
  selectExercise: (id: string, exerciseId: string, openForStudents?: boolean) =>
    api.post<LiveLessonState>(`/live-lessons/${id}/exercise`, {
      exerciseId,
      ...(openForStudents != null ? { openForStudents } : {}),
    }),
  setOpen: (id: string, openForStudents: boolean) =>
    api.post<LiveLessonState>(`/live-lessons/${id}/open`, { openForStudents }),
  getActive: () => api.get<LiveLessonState | null>("/live-lessons/active"),
  joinActive: () => api.post<LiveLessonState>("/live-lessons/active/join"),
  join: (id: string) => api.post<LiveLessonState>(`/live-lessons/${id}/join`),
  progress: (
    id: string,
    body: { progress: number; score?: number | null; status?: string; answers?: unknown },
  ) => api.post<LiveLessonState>(`/live-lessons/${id}/progress`, body),
  heartbeat: (id: string) => api.post(`/live-lessons/${id}/heartbeat`),
}
