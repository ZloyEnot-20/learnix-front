"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Play,
  Radio,
  Square,
  Users,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CardGridSkeleton, TableSkeleton } from "@/components/admin/skeletons"
import { BookExerciseRenderer } from "@/components/admin/live-lesson/book-exercise-renderer"
import {
  BOOK_ID_CAMBRIDGE_VOCAB_ADVANCED,
  fetchAvailableBooks,
  fetchBookDocument,
  fetchLessonSteps,
  listUnitsFromMeta,
} from "@/lib/books/catalog"
import type {
  LessonStep,
  LiveExerciseResult,
  LiveLessonState,
  LiveStudentProgress,
} from "@/lib/books/types"
import {
  formatStudentAnswerRows,
  percentCorrectLabel,
} from "@/lib/books/format-student-answers"
import { liveLessonsApi, type LiveBookSummary } from "@/lib/live-lessons-api"
import { useLiveLessonSocket } from "@/lib/use-live-lesson-socket"
import { useAdminData } from "@/lib/admin-data-context"
import { cn } from "@/lib/utils"

type View = "books" | "units" | "workspace" | "results"

const PROGRESS_POLL_MS = 2000

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function recount(students: LiveLessonState["students"]) {
  return {
    onlineCount: students.filter((s) => s.status === "online" || s.status === "working").length,
    workingCount: students.filter((s) => s.status === "working").length,
    doneCount: students.filter((s) => s.status === "done").length,
  }
}

function scorePercentValue(s: {
  score?: number | null
  scoreDetail?: LiveStudentProgress["scoreDetail"] | null
}): number | null {
  if (s.scoreDetail && s.scoreDetail.total > 0) {
    return Math.round((100 * s.scoreDetail.correct) / s.scoreDetail.total)
  }
  if (s.score != null && Number.isFinite(s.score)) return Math.round(s.score)
  return null
}

/** Red → yellow → green by correctness. */
function scoreBarColor(pct: number): string {
  const p = Math.min(100, Math.max(0, pct)) / 100
  const hue = p * 120
  return `hsl(${hue} 78% 42%)`
}

function buildLessonStats(live: LiveLessonState) {
  const results = live.exerciseResults ?? []
  const byUnit = new Map<
    number,
    { unitNumber: number; exercises: Map<string, { scores: number[]; submissions: number }> }
  >()

  for (const r of results) {
    const unit = Number(r.unitNumber)
    if (!byUnit.has(unit)) {
      byUnit.set(unit, { unitNumber: unit, exercises: new Map() })
    }
    const unitRow = byUnit.get(unit)!
    if (!unitRow.exercises.has(r.exerciseId)) {
      unitRow.exercises.set(r.exerciseId, { scores: [], submissions: 0 })
    }
    const ex = unitRow.exercises.get(r.exerciseId)!
    ex.submissions += 1
    if (r.score != null && Number.isFinite(r.score)) ex.scores.push(Number(r.score))
  }

  const byStudent = new Map<
    string,
    { studentId: string; name: string; scores: number[]; results: LiveExerciseResult[] }
  >()
  for (const r of results) {
    if (!byStudent.has(r.studentId)) {
      byStudent.set(r.studentId, {
        studentId: r.studentId,
        name: r.name || "Student",
        scores: [],
        results: [],
      })
    }
    const row = byStudent.get(r.studentId)!
    row.results.push(r)
    if (r.score != null && Number.isFinite(r.score)) row.scores.push(Number(r.score))
  }

  // Include roster students with zero submissions
  for (const s of live.students ?? []) {
    if (!byStudent.has(s.studentId)) {
      byStudent.set(s.studentId, {
        studentId: s.studentId,
        name: s.name,
        scores: [],
        results: [],
      })
    }
  }

  const units = [...byUnit.values()]
    .sort((a, b) => a.unitNumber - b.unitNumber)
    .map((u) => ({
      unitNumber: u.unitNumber,
      exercises: [...u.exercises.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([exerciseId, data]) => ({
          exerciseId,
          submissions: data.submissions,
          avgScore:
            data.scores.length > 0
              ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
              : null,
        })),
    }))

  const students = [...byStudent.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({
      studentId: s.studentId,
      name: s.name,
      overallPct:
        s.scores.length > 0
          ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
          : null,
      exerciseCount: s.results.length,
      results: s.results.sort(
        (a, b) =>
          Number(a.unitNumber) - Number(b.unitNumber) ||
          String(a.exerciseId).localeCompare(String(b.exerciseId)),
      ),
    }))

  const allScores = results
    .map((r) => r.score)
    .filter((n): n is number => n != null && Number.isFinite(n))
  const classAvg =
    allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null

  return {
    units,
    students,
    classAvg,
    submissionCount: results.length,
    exerciseCount: new Set(results.map((r) => `${r.unitNumber}:${r.exerciseId}`)).size,
  }
}

function stepStatus(
  step: LessonStep,
  live: LiveLessonState | null,
  selectedId: string | null,
  viewingAssignedUnit: boolean,
): "pending" | "current" | "open" | "done" {
  if (!live || !viewingAssignedUnit) {
    if (selectedId === step.id) return "current"
    return "pending"
  }
  if (live.currentExercise === step.exerciseId) {
    return live.openForStudents ? "open" : "current"
  }
  return "pending"
}

export default function TeacherLessonSection() {
  const { groups, students, ensureLists } = useAdminData()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>("books")
  const [books, setBooks] = useState<LiveBookSummary[]>([])
  const [bookId, setBookId] = useState(BOOK_ID_CAMBRIDGE_VOCAB_ADVANCED)
  const [bookTitle, setBookTitle] = useState("")
  const [units, setUnits] = useState<
    Array<{
      unitNumber: number
      title: string
      subtitle?: string
      ready: boolean
      stepCount: number
      pages?: Array<{ page: number; label: string }>
    }>
  >([])
  const [unitNumber, setUnitNumber] = useState<number | null>(null)
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [stepsLoading, setStepsLoading] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [groupId, setGroupId] = useState<string>("")
  const [live, setLive] = useState<LiveLessonState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finishOpen, setFinishOpen] = useState(false)
  const [inspectStudent, setInspectStudent] = useState<LiveStudentProgress | null>(null)
  const liveIdRef = useRef<string | null>(null)

  useEffect(() => {
    liveIdRef.current = live?.id ?? null
  }, [live?.id])

  useEffect(() => {
    void ensureLists(["groups", "students"])
  }, [ensureLists])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const list = await fetchAvailableBooks()
        if (cancelled) return
        setBooks(list)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load books")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openBook = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      const doc = await fetchBookDocument(id)
      const meta = await liveLessonsApi.getBook(id)
      setBookId(id)
      setBookTitle(doc.book.title || meta.book?.title || id)
      setUnits(listUnitsFromMeta(meta.units))
      setView("units")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open book")
    } finally {
      setBusy(false)
    }
  }

  /** Preview only — does not assign to students. */
  const openUnit = async (n: number, ready: boolean) => {
    if (!ready) return
    setUnitNumber(n)
    setSelectedStepId(null)
    setView("workspace")
    setStepsLoading(true)
    setError(null)
    try {
      const flow = await fetchLessonSteps(bookId, n)
      setSteps(flow)
      setSelectedStepId(flow[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load unit")
      setSteps([])
    } finally {
      setStepsLoading(false)
    }
  }

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? steps[0] ?? null
  const assignedUnit = live?.currentUnit ?? null
  const viewingAssignedUnit =
    live != null &&
    unitNumber != null &&
    Number(live.currentUnit) === Number(unitNumber) &&
    Boolean(live.openForStudents || !live.unitCompleted)

  const studentTotal = live?.students?.length ?? 0
  const donePct =
    studentTotal > 0 ? Math.round(((live?.doneCount ?? 0) / studentTotal) * 100) : 0
  const liveExerciseOpen = Boolean(live?.openForStudents && live.currentExercise)

  const onState = useCallback((state: LiveLessonState) => {
    setLive(state)
  }, [])

  const onPresence = useCallback(
    (patch: {
      studentId: string
      status: string
      progress?: number
      score?: number | null
      scoreDetail?: LiveStudentProgress["scoreDetail"] | null
      answers?: unknown
      lastSeenAt?: string
    }) => {
      setLive((prev) => {
        if (!prev) return prev
        const studentsNext = (prev.students ?? []).map((s) => {
          if (s.studentId !== patch.studentId) return s
          const nextStatus =
            s.status === "done" && patch.status === "online"
              ? s.status
              : (patch.status as typeof s.status)
          return {
            ...s,
            status: nextStatus,
            ...(typeof patch.progress === "number" ? { progress: patch.progress } : {}),
            ...(patch.score !== undefined ? { score: patch.score } : {}),
            ...(patch.scoreDetail !== undefined
              ? { scoreDetail: patch.scoreDetail ?? undefined }
              : {}),
            ...(patch.answers !== undefined ? { answers: patch.answers ?? undefined } : {}),
          }
        })
        return {
          ...prev,
          students: studentsNext,
          ...recount(studentsNext),
        }
      })
    },
    [],
  )

  useLiveLessonSocket(live?.id ?? null, {
    onState,
    onPresence,
    onError: (msg) => setError(msg),
  })

  /** Reliable progress sync — sockets alone were missing student completes. */
  useEffect(() => {
    if (!live?.id) return
    if (live.lessonStatus === "finished") return

    let cancelled = false
    const tick = async () => {
      const id = liveIdRef.current
      if (!id || cancelled) return
      try {
        const next = await liveLessonsApi.get(id)
        if (!cancelled && liveIdRef.current === id) setLive(next)
      } catch {
        /* ignore transient poll errors */
      }
    }

    const t = setInterval(() => {
      void tick()
    }, PROGRESS_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [live?.id, live?.lessonStatus])

  const syncLive = async (next: LiveLessonState) => {
    setLive(next)
  }

  const runAction = async (fn: () => Promise<LiveLessonState>) => {
    setBusy(true)
    setError(null)
    try {
      await syncLive(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  const prepareLesson = async () => {
    if (!groupId) {
      setError("Select a group before preparing the lesson")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const session = await liveLessonsApi.create({ groupId, bookId })
      await syncLive(session)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create live lesson")
    } finally {
      setBusy(false)
    }
  }

  const selectExerciseLocal = (step: LessonStep) => {
    setSelectedStepId(step.id)
  }

  /**
   * Assign selected exercise to students immediately:
   * ensures unit is active, then opens the exercise.
   */
  const assignExercise = async (step: LessonStep) => {
    if (!live || unitNumber == null) return
    if (live.lessonStatus !== "active") {
      setError("Start the lesson before assigning an exercise")
      return
    }
    if (
      live.openForStudents &&
      live.currentUnit != null &&
      Number(live.currentUnit) !== Number(unitNumber)
    ) {
      setError("Finish the current exercise before assigning from another unit")
      return
    }

    setBusy(true)
    setError(null)
    try {
      let session = live
      const needsUnit =
        session.currentUnit == null ||
        session.unitCompleted ||
        Number(session.currentUnit) !== Number(unitNumber)
      if (needsUnit) {
        session = await liveLessonsApi.assignUnit(session.id, unitNumber)
      }
      session = await liveLessonsApi.selectExercise(session.id, step.exerciseId, true)
      await syncLive(session)
      setSelectedStepId(step.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign exercise")
    } finally {
      setBusy(false)
    }
  }

  const confirmFinish = async () => {
    if (!live) return
    setFinishOpen(false)
    setBusy(true)
    setError(null)
    try {
      const next = await liveLessonsApi.finish(live.id)
      setLive(next)
      setView("results")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed")
    } finally {
      setBusy(false)
    }
  }

  const finishExercise = async () => {
    if (!live) return
    await runAction(() => liveLessonsApi.setOpen(live.id, false))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardGridSkeleton count={3} columns={3} />
        <TableSkeleton rows={4} />
      </div>
    )
  }

  if (view === "results" && live) {
    const stats = buildLessonStats(live)
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Lesson results</h2>
            <p className="text-sm text-slate-500">
              {bookTitle || "Live lesson"} · finished{" "}
              {live.finishedAt ? new Date(live.finishedAt).toLocaleString() : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setView("units")}>
              Back to units
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setLive(null)
                setView("books")
              }}
            >
              New lesson
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Class average</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {stats.classAvg != null ? `${stats.classAvg}%` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exercises</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.exerciseCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submissions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.submissionCount}</p>
          </div>
        </div>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">By unit</h3>
          {stats.units.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              No graded submissions were recorded for this lesson.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {stats.units.map((u) => {
                const unitMeta = units.find((x) => x.unitNumber === u.unitNumber)
                return (
                  <div
                    key={u.unitNumber}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <h4 className="font-semibold text-slate-900">
                      Unit {u.unitNumber}
                      {unitMeta?.title ? `: ${unitMeta.title}` : ""}
                    </h4>
                    <ul className="mt-3 space-y-2">
                      {u.exercises.map((ex) => (
                        <li
                          key={ex.exerciseId}
                          className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-slate-800">Ex {ex.exerciseId}</span>
                          <span className="text-slate-500">
                            {ex.submissions} sub ·{" "}
                            {ex.avgScore != null ? `${ex.avgScore}% avg` : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            By student
          </h3>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Overall</th>
                  <th className="px-4 py-3 font-medium">Exercises</th>
                  <th className="px-4 py-3 font-medium">Breakdown</th>
                </tr>
              </thead>
              <tbody>
                {stats.students.map((s) => (
                  <tr key={s.studentId} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3">
                      {s.overallPct != null ? (
                        <span className="font-semibold text-emerald-700">{s.overallPct}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.exerciseCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.results.length === 0 ? (
                          <span className="text-slate-400">No submissions</span>
                        ) : (
                          s.results.map((r) => (
                            <Badge key={`${r.unitNumber}-${r.exerciseId}`} variant="outline">
                              U{r.unitNumber}·{r.exerciseId}{" "}
                              {r.score != null ? `${Math.round(r.score)}%` : "—"}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  if (view === "books") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Books</h2>
          <p className="text-sm text-slate-500">
            Platform curriculum (shared for all organisations). Run a live lesson without PDF.
          </p>
        </div>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => {
            const id = b.id || b.bookId || ""
            return (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => void openBook(id)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md"
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-900">{b.title}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {b.author}
                  {b.year ? ` · ${b.year}` : ""}
                </p>
                <p className="mt-3 text-xs text-slate-400">
                  {b.readyUnitCount ?? 0} units ready · {b.unitCount} total
                </p>
              </button>
            )
          })}
          {books.length === 0 && !error && (
            <p className="text-sm text-slate-500">No books in the database yet. Run backend seed.</p>
          )}
        </div>
      </div>
    )
  }

  const lessonControls = (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
      <Select
        value={groupId || undefined}
        onValueChange={setGroupId}
        disabled={Boolean(live) && live.lessonStatus !== "finished"}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select group" />
        </SelectTrigger>
        <SelectContent>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!live && (
        <Button disabled={busy || !groupId} onClick={() => void prepareLesson()}>
          Prepare lesson
        </Button>
      )}

      {live && (
        <>
          {live.lessonStatus !== "active" && live.lessonStatus !== "finished" && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void runAction(() => liveLessonsApi.start(live.id))}
            >
              <Play className="mr-1 h-4 w-4" />
              Start lesson
            </Button>
          )}
          {live.lessonStatus === "active" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => setFinishOpen(true)}
            >
              <Square className="mr-1 h-4 w-4" />
              Finish lesson
            </Button>
          )}
          {live.lessonStatus === "finished" && (
            <Button size="sm" variant="outline" onClick={() => setView("results")}>
              View results
            </Button>
          )}
          <div className="ml-auto flex flex-wrap gap-3 text-xs text-slate-600">
            <span>
              Status: <strong className="capitalize">{live.lessonStatus}</strong>
            </span>
            {assignedUnit != null && (
              <span>
                Unit {assignedUnit}
                {live.unitCompleted ? " · completed" : " · active"}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Online {live.onlineCount}
            </span>
            <span>Working {live.workingCount}</span>
            <span>Done {live.doneCount}</span>
          </div>
        </>
      )}
    </div>
  )

  if (view === "units") {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => setView("books")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Books
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{bookTitle}</h2>
            <p className="text-sm text-slate-500">
              Open a unit to preview. Assign each exercise from the lesson flow.
            </p>
          </div>
        </div>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}
        {lessonControls}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {units.map((u) => {
            const isActive =
              live != null && Number(live.currentUnit) === u.unitNumber && !live.unitCompleted
            const isCompleted =
              live != null && Number(live.currentUnit) === u.unitNumber && Boolean(live.unitCompleted)
            return (
              <button
                key={u.unitNumber}
                type="button"
                disabled={!u.ready || busy}
                onClick={() => void openUnit(u.unitNumber, u.ready)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition",
                  u.ready
                    ? "border-slate-200 bg-white hover:border-sky-300 hover:shadow-sm"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-70",
                  isActive && "border-emerald-300 ring-1 ring-emerald-200",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-sky-800">Unit {u.unitNumber}</span>
                  <div className="flex flex-wrap gap-1">
                    {!u.ready && <Badge variant="secondary">Soon</Badge>}
                    {isActive && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
                    )}
                    {isCompleted && <Badge variant="secondary">Completed</Badge>}
                    {u.ready && !isActive && !isCompleted && (
                      <Badge variant="outline">{u.stepCount} exercises</Badge>
                    )}
                  </div>
                </div>
                <h3 className="mt-2 font-medium text-slate-900">{u.title}</h3>
                {u.subtitle && <p className="mt-1 text-xs text-slate-500">{u.subtitle}</p>}
                {u.pages && u.pages.length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    pp. {u.pages[0].page}–{u.pages[u.pages.length - 1].page} ·{" "}
                    {u.pages.map((p) => p.page).join(", ")}
                  </p>
                )}
              </button>
            )
          })}
        </div>

        <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finish this lesson?</AlertDialogTitle>
              <AlertDialogDescription>
                Students will leave the live room. You cannot continue this session after finishing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={(e) => {
                  e.preventDefault()
                  void confirmFinish()
                }}
              >
                Finish lesson
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  const unitMeta = units.find((u) => u.unitNumber === unitNumber)
  const canAssignFromThisUnit =
    Boolean(live) &&
    live!.lessonStatus === "active" &&
    (live!.currentUnit == null ||
      live!.unitCompleted ||
      Number(live!.currentUnit) === Number(unitNumber) ||
      !live!.openForStudents)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView("units")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Units
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Unit {unitNumber}: {unitMeta?.title}
              {Number(live?.currentUnit) === Number(unitNumber) && !live?.unitCompleted && (
                <Badge className="ml-2 bg-emerald-600 align-middle hover:bg-emerald-600">Active</Badge>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {bookTitle}
              {live?.lessonStatus === "active"
                ? " · Select an exercise, then Assign to open it for students"
                : ""}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {lessonControls}

      {liveExerciseOpen && live && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <Radio className="mr-1 h-3 w-3" />
              Live
            </Badge>
            <span className="text-sm font-semibold text-emerald-950">
              Unit {live.currentUnit} · Ex {live.currentExercise}
            </span>
            <span className="text-sm text-emerald-800">
              {live.doneCount}/{studentTotal || live.studentCount || 0} completed · {donePct}%
            </span>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-emerald-200 sm:w-40">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all"
              style={{ width: `${donePct}%` }}
            />
          </div>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void finishExercise()}>
            Finish exercise
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_280px]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Lesson flow
          </p>
          {stepsLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
              {steps.map((step) => {
                const status = stepStatus(
                  step,
                  live,
                  selectedStep?.id ?? null,
                  viewingAssignedUnit,
                )
                const selected = selectedStep?.id === step.id
                const isLiveExercise =
                  Boolean(live?.openForStudents) && live?.currentExercise === step.exerciseId
                const showAssign =
                  selected && canAssignFromThisUnit && !isLiveExercise

                return (
                  <li key={step.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-xl transition",
                        selected ? "bg-sky-50 text-sky-950" : "hover:bg-slate-50",
                        isLiveExercise && "ring-1 ring-emerald-200",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => selectExerciseLocal(step)}
                        className="flex min-w-0 flex-1 items-start gap-2 px-2.5 py-2 text-left text-sm"
                      >
                        {status === "open" ? (
                          <Radio className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : status === "current" ? (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 fill-sky-500 text-sky-500" />
                        ) : status === "done" ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {step.exerciseId === "test_practice"
                              ? step.sectionLabel
                              : `Ex ${step.exerciseId}`}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
                            {step.uiLabel}
                          </span>
                        </span>
                      </button>
                      {showAssign ? (
                        <Button
                          size="sm"
                          className="mr-1.5 h-7 shrink-0 px-2 text-xs"
                          disabled={busy}
                          onClick={() => void assignExercise(step)}
                        >
                          Assign
                        </Button>
                      ) : null}
                      {isLiveExercise ? (
                        <Badge className="mr-1.5 shrink-0 bg-emerald-600 hover:bg-emerald-600">
                          Live
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        <main className="min-h-[420px] rounded-2xl border border-slate-200 bg-white p-5">
          {selectedStep ? (
            <BookExerciseRenderer step={selectedStep} showAnswers />
          ) : (
            <p className="text-sm text-slate-500">Select an exercise from the lesson flow.</p>
          )}
        </main>

        <aside className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Progress panel
          </p>
          {!live && (
            <p className="px-1 text-sm text-slate-500">
              Prepare a lesson with a group to see live student progress.
            </p>
          )}
          {live && (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto">
              {(live.students ?? []).map((s) => {
                const isOnline = s.status === "online" || s.status === "working" || s.status === "done"
                const isDone = s.status === "done"
                const scorePct = scorePercentValue(s)
                const barPct = scorePct ?? 0
                return (
                  <button
                    key={s.studentId}
                    type="button"
                    onClick={() => setInspectStudent(s)}
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition hover:shadow-sm",
                      isDone
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-sky-100 bg-sky-50/40 hover:border-sky-200",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            isOnline ? "bg-emerald-500" : "bg-slate-300",
                          )}
                          title={isOnline ? "Online" : "Offline"}
                        />
                        <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {scorePct != null ? (
                          <span
                            className="rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white"
                            style={{ backgroundColor: scoreBarColor(scorePct) }}
                          >
                            {scorePct}%
                          </span>
                        ) : null}
                        {isDone ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Completed</Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor:
                            scorePct != null ? scoreBarColor(scorePct) : "transparent",
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                      <span>
                        {scorePct != null
                          ? `${scorePct}% correct`
                          : isDone
                            ? "Submitted"
                            : "In progress"}
                      </span>
                      <span className="font-semibold text-slate-700">
                        {formatElapsed(s.elapsedSeconds ?? 0)}
                      </span>
                    </div>
                  </button>
                )
              })}
              {(live.students ?? []).length === 0 && (
                <p className="text-sm text-slate-500">No students in this group.</p>
              )}
            </div>
          )}
          {!live && groupId && (
            <ul className="mt-3 space-y-1">
              {students
                .filter((s) => s.groupId === groupId)
                .map((s) => (
                  <li key={s.id} className="rounded-lg px-2 py-1.5 text-sm text-slate-600">
                    {s.name}
                  </li>
                ))}
            </ul>
          )}
        </aside>
      </div>

      <AlertDialog open={finishOpen} onOpenChange={setFinishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish this lesson?</AlertDialogTitle>
            <AlertDialogDescription>
              Students will leave the live room. You cannot continue this session after finishing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                void confirmFinish()
              }}
            >
              Finish lesson
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(inspectStudent)}
        onOpenChange={(open) => {
          if (!open) setInspectStudent(null)
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{inspectStudent?.name ?? "Student"}</DialogTitle>
            <DialogDescription>
              {inspectStudent?.status === "done"
                ? "Answers for the current exercise"
                : "Student has not completed this exercise yet"}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const rows = inspectStudent ? formatStudentAnswerRows(inspectStudent) : []
            const pct = inspectStudent ? percentCorrectLabel(inspectStudent) : null
            if (rows.length > 0) {
              return (
                <div className="space-y-3">
                  {pct ? (
                    <p className="text-sm font-medium text-slate-800">
                      {pct} correct
                      {inspectStudent?.scoreDetail && inspectStudent.scoreDetail.total > 0
                        ? ` · ${inspectStudent.scoreDetail.correct}/${inspectStudent.scoreDetail.total}`
                        : ""}
                    </p>
                  ) : null}
                  <ul className="space-y-2">
                    {rows.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-sm",
                          item.ok === true && "border-emerald-200 bg-emerald-50/80",
                          item.ok === false && "border-rose-200 bg-rose-50/80",
                          item.ok == null && "border-slate-200 bg-slate-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">{item.label}</span>
                          {item.ok != null ? (
                            <Badge
                              variant="outline"
                              className={
                                item.ok
                                  ? "border-emerald-400 text-emerald-800"
                                  : "border-rose-400 text-rose-800"
                              }
                            >
                              {item.ok ? "Correct" : "Mistake"}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Student: <strong>{item.given}</strong>
                        </p>
                        {item.ok === false && item.expected ? (
                          <p className="text-xs text-slate-600">
                            Expected: <strong>{item.expected}</strong>
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            }
            return (
              <p className="text-sm text-slate-500">
                No answers yet. Ask the student to Complete after answering.
              </p>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
