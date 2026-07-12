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
import type { LessonStep, LiveLessonState } from "@/lib/books/types"
import { liveLessonsApi, type LiveBookSummary } from "@/lib/live-lessons-api"
import { useLiveLessonSocket } from "@/lib/use-live-lesson-socket"
import { useAdminData } from "@/lib/admin-data-context"
import { cn } from "@/lib/utils"

type View = "books" | "units" | "workspace"

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
    Array<{ unitNumber: number; title: string; subtitle?: string; ready: boolean; stepCount: number }>
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
  const unitLocked = Boolean(live && assignedUnit != null && !live.unitCompleted)
  const viewingAssignedUnit =
    live != null &&
    unitNumber != null &&
    Number(live.currentUnit) === Number(unitNumber) &&
    !live.unitCompleted

  const onState = useCallback((state: LiveLessonState) => {
    setLive(state)
  }, [])

  const onPresence = useCallback(
    (patch: {
      studentId: string
      status: string
      progress?: number
      score?: number | null
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
    if (unitLocked && Number(live.currentUnit) !== Number(unitNumber)) {
      setError("Complete the active unit before assigning from another unit")
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
    await runAction(() => liveLessonsApi.finish(live.id))
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <CardGridSkeleton count={3} columns={3} />
        <TableSkeleton rows={4} />
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
          {live.lessonStatus !== "finished" && (
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
    (!unitLocked || Number(live!.currentUnit) === Number(unitNumber))

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
              {viewingAssignedUnit && (
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
        {viewingAssignedUnit && (
          <Button
            size="sm"
            variant="outline"
            disabled={!live || busy}
            onClick={() => void runAction(() => liveLessonsApi.completeUnit(live!.id))}
          >
            Complete unit
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {lessonControls}

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
                const isOpenForStudents =
                  viewingAssignedUnit &&
                  live?.openForStudents &&
                  live.currentExercise === step.exerciseId
                const showAssign =
                  selected && canAssignFromThisUnit && !isOpenForStudents

                return (
                  <li key={step.id}>
                    <div
                      className={cn(
                        "flex items-center gap-1 rounded-xl transition",
                        selected ? "bg-sky-50 text-sky-950" : "hover:bg-slate-50",
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
                      {selected && isOpenForStudents ? (
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
              {(live.students ?? []).map((s) => (
                <div
                  key={s.studentId}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "capitalize",
                        s.status === "working" && "border-sky-300 text-sky-800",
                        s.status === "done" && "border-emerald-300 text-emerald-800",
                        s.status === "online" && "border-violet-300 text-violet-800",
                      )}
                    >
                      {s.status}
                    </Badge>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, s.progress ?? 0))}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                    <span>{s.progress ?? 0}%</span>
                    <span>
                      {s.score != null ? `Score ${s.score}` : "—"} ·{" "}
                      {formatElapsed(s.elapsedSeconds ?? 0)}
                    </span>
                  </div>
                </div>
              ))}
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
    </div>
  )
}
