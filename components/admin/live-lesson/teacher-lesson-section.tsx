"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  History,
  Play,
  Plus,
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
import { TableSkeleton } from "@/components/admin/skeletons"
import { BookExerciseRenderer } from "@/components/admin/live-lesson/book-exercise-renderer"
import {
  CambridgeBookChrome,
  CambridgeSectionBanner,
  CambridgeUnitHeader,
} from "@/components/admin/live-lesson/cambridge-book-chrome"
import {
  BOOK_ID_CAMBRIDGE_VOCAB_ADVANCED,
  fetchAvailableBooks,
  fetchBookDocument,
  fetchLessonSteps,
  listUnitsFromMeta,
} from "@/lib/books/catalog"
import { shouldSkipExercise } from "@/lib/books/should-skip-exercise"
import { isLiveGradableExercise } from "@/lib/books/is-live-gradable-exercise"
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
import {
  liveLessonsApi,
  type LiveBookSummary,
  type LiveLessonListItem,
} from "@/lib/live-lessons-api"
import { useLiveLessonSocket } from "@/lib/use-live-lesson-socket"
import { useAdminData } from "@/lib/admin-data-context"
import { cn } from "@/lib/utils"

type View = "history" | "books" | "units" | "workspace" | "results"

type UnitPageMeta = {
  page: number
  label: string
  exercise_ids: string[]
}

const PROGRESS_POLL_MS = 2000

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

function statusBadgeClass(status: string) {
  if (status === "active") return "bg-emerald-600 hover:bg-emerald-600"
  if (status === "paused") return "bg-amber-500 hover:bg-amber-500"
  if (status === "idle") return "bg-sky-600 hover:bg-sky-600"
  return ""
}

export default function TeacherLessonSection() {
  const router = useRouter()
  const params = useParams<{ section?: string[] }>()
  const { groups, students, ensureLists } = useAdminData()
  const selectedLessonId = useMemo(() => {
    const parts = Array.isArray(params.section) ? params.section : []
    if (parts[0] !== "lessons" || !parts[1]) return null
    return parts[1]
  }, [params.section])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>("history")
  const [history, setHistory] = useState<LiveLessonListItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
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
      pages?: UnitPageMeta[]
    }>
  >([])
  const [unitNumber, setUnitNumber] = useState<number | null>(null)
  const [unitPages, setUnitPages] = useState<UnitPageMeta[]>([])
  const [pageIndex, setPageIndex] = useState(0)
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
  const openingLessonIdRef = useRef<string | null>(null)

  const groupName = useCallback(
    (id: string) => groups.find((g) => g.id === id)?.name ?? "Group",
    [groups],
  )

  const bookLabel = useCallback(
    (id: string) => books.find((b) => (b.id || b.bookId) === id)?.title ?? id,
    [books],
  )

  useEffect(() => {
    liveIdRef.current = live?.id ?? null
  }, [live?.id])

  useEffect(() => {
    void ensureLists(["groups", "students"])
  }, [ensureLists])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const [list, bookList] = await Promise.all([
        liveLessonsApi.list(50),
        fetchAvailableBooks().catch(() => [] as LiveBookSummary[]),
      ])
      setHistory(list)
      setBooks(bookList)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lessons")
    } finally {
      setHistoryLoading(false)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const openLessonRoute = useCallback(
    (id: string) => {
      router.push(`/admin/lessons/${id}`, { scroll: false })
    },
    [router],
  )

  const startNewLesson = () => {
    setLive(null)
    setGroupId("")
    setUnitNumber(null)
    setSteps([])
    setUnitPages([])
    setPageIndex(0)
    setError(null)
    setView("books")
    if (selectedLessonId) {
      router.push("/admin/lessons", { scroll: false })
    }
    if (books.length === 0) {
      void fetchAvailableBooks()
        .then(setBooks)
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load books"))
    }
  }

  const openLessonById = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      const session = await liveLessonsApi.get(id)
      setLive(session)
      setGroupId(session.groupId)
      setBookId(session.bookId)
      if (session.lessonStatus === "finished") {
        setBookTitle(bookLabel(session.bookId))
        setView("results")
        return
      }
      const doc = await fetchBookDocument(session.bookId)
      const meta = await liveLessonsApi.getBook(session.bookId)
      setBookTitle(doc.book.title || meta.book?.title || session.bookId)
      setUnits(listUnitsFromMeta(meta.units))
      if (session.currentUnit != null) {
        await openUnit(session.currentUnit, true, {
          nextLive: session,
          nextBookId: session.bookId,
          unitList: listUnitsFromMeta(meta.units),
        })
      } else {
        setView("units")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open lesson")
      router.replace("/admin/lessons", { scroll: false })
    } finally {
      setBusy(false)
    }
  }

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
  const openUnit = async (
    n: number,
    ready: boolean,
    opts?: {
      nextLive?: LiveLessonState
      nextBookId?: string
      unitList?: typeof units
    },
  ) => {
    if (!ready) return
    const activeBookId = opts?.nextBookId ?? bookId
    const unitList = opts?.unitList ?? units
    setUnitNumber(n)
    setSelectedStepId(null)
    setPageIndex(0)
    setView("workspace")
    setStepsLoading(true)
    setError(null)
    try {
      const flow = await fetchLessonSteps(activeBookId, n)
      const visible = flow.filter((s) => !shouldSkipExercise(s))
      setSteps(visible)
      setSelectedStepId(visible[0]?.id ?? null)
      const metaUnit = unitList.find((u) => u.unitNumber === n)
      const pagesFromMeta = metaUnit?.pages ?? []
      const pages: UnitPageMeta[] =
        pagesFromMeta.length > 0
          ? pagesFromMeta.map((p) => ({
              page: p.page,
              label: p.label,
              exercise_ids: p.exercise_ids ?? [],
            }))
          : visible.map((s, i) => ({
              page: i + 1,
              label: `${s.sectionLabel} · ${s.exerciseId}`,
              exercise_ids: [s.exerciseId],
            }))
      setUnitPages(pages)
      if (opts?.nextLive) setLive(opts.nextLive)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load unit")
      setSteps([])
      setUnitPages([])
    } finally {
      setStepsLoading(false)
    }
  }

  const assignedUnit = live?.currentUnit ?? null

  const currentPage = unitPages[pageIndex] ?? null
  const pageSteps = useMemo(() => {
    if (!currentPage) return steps
    const ids = new Set(currentPage.exercise_ids.map(String))
    const matched = steps.filter((s) => ids.has(String(s.exerciseId)))
    return currentPage.exercise_ids
      .map((id) => matched.find((s) => String(s.exerciseId) === String(id)))
      .filter((s): s is LessonStep => Boolean(s))
  }, [currentPage, steps])

  const visiblePageIndexes = useMemo(() => {
    if (!unitPages.length) return [0]
    return unitPages
      .map((p, idx) => {
        const ids = new Set(p.exercise_ids.map(String))
        const hasVisible = steps.some((s) => ids.has(String(s.exerciseId)))
        return hasVisible ? idx : -1
      })
      .filter((i) => i >= 0)
  }, [unitPages, steps])

  useEffect(() => {
    if (!visiblePageIndexes.length) return
    if (!visiblePageIndexes.includes(pageIndex)) {
      setPageIndex(visiblePageIndexes[0])
    }
  }, [visiblePageIndexes, pageIndex])

  useEffect(() => {
    if (!pageSteps.length) return
    if (!pageSteps.some((s) => s.id === selectedStepId)) {
      setSelectedStepId(pageSteps[0].id)
    }
  }, [pageSteps, selectedStepId])

  const canPrevPage = visiblePageIndexes.some((i) => i < pageIndex)
  const canNextPage = visiblePageIndexes.some((i) => i > pageIndex)
  const goPrevPage = () => {
    const prev = [...visiblePageIndexes].reverse().find((i) => i < pageIndex)
    if (prev != null) setPageIndex(prev)
  }
  const goNextPage = () => {
    const next = visiblePageIndexes.find((i) => i > pageIndex)
    if (next != null) setPageIndex(next)
  }
  const visibleOrdinal = Math.max(0, visiblePageIndexes.indexOf(pageIndex))
  const sectionBannerTitle = useMemo(() => {
    const label = currentPage?.label ?? ""
    const head = label.split("·")[0]?.trim()
    return head || pageSteps[0]?.sectionLabel || undefined
  }, [currentPage, pageSteps])

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
      router.replace(`/admin/lessons/${session.id}`, { scroll: false })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create live lesson")
    } finally {
      setBusy(false)
    }
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
      void loadHistory()
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

  const backToHistory = () => {
    setLive(null)
    setUnitNumber(null)
    setSteps([])
    setUnitPages([])
    setView("history")
    router.push("/admin/lessons", { scroll: false })
    void loadHistory()
  }

  useEffect(() => {
    if (!selectedLessonId) {
      // New-lesson flow (book/unit pick) has no id in the URL — keep it.
      if (!live && (view === "books" || view === "units" || view === "workspace")) return
      if (view === "history") return
      setLive(null)
      setUnitNumber(null)
      setSteps([])
      setUnitPages([])
      setPageIndex(0)
      setSelectedStepId(null)
      setError(null)
      setView("history")
      void loadHistory()
      return
    }
    if (live?.id === selectedLessonId || openingLessonIdRef.current === selectedLessonId) return
    openingLessonIdRef.current = selectedLessonId
    void openLessonById(selectedLessonId).finally(() => {
      if (openingLessonIdRef.current === selectedLessonId) {
        openingLessonIdRef.current = null
      }
    })
    // Intentionally drive only from the URL segment — openLessonById reads latest setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLessonId])

  if (
    loading ||
    (Boolean(selectedLessonId) && live?.id !== selectedLessonId) ||
    (view === "history" && historyLoading && history.length === 0)
  ) {
    return (
      <div className="space-y-4">
        <TableSkeleton rows={6} columns={8} />
      </div>
    )
  }

  if (view === "history") {
    const openLessons = history.filter((h) => h.lessonStatus !== "finished")
    const pastLessons = history.filter((h) => h.lessonStatus === "finished")

    const renderRows = (rows: LiveLessonListItem[], { finished }: { finished: boolean }) =>
      rows.map((item) => (
        <tr
          key={item.id}
          onClick={() => {
            if (!busy) openLessonRoute(item.id)
          }}
          className={cn(
            "cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <td className="px-3 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {finished ? (
                <Badge variant="secondary">finished</Badge>
              ) : (
                <Badge className={statusBadgeClass(item.lessonStatus)}>{item.lessonStatus}</Badge>
              )}
              {!finished && item.openForStudents ? (
                <Badge variant="outline" className="border-emerald-400 text-emerald-800">
                  open
                </Badge>
              ) : null}
            </div>
          </td>
          <td className="px-3 py-3 font-medium text-slate-900">
            {groupName(String(item.groupId))}
          </td>
          <td className="px-3 py-3 text-slate-700">{bookLabel(item.bookId)}</td>
          <td className="px-3 py-3 tabular-nums text-slate-700">
            {item.currentUnit != null ? item.currentUnit : "—"}
          </td>
          <td className="px-3 py-3 text-slate-700">{item.currentExercise ?? "—"}</td>
          <td className="px-3 py-3 tabular-nums text-slate-700">
            {finished
              ? item.studentCount
              : `${item.onlineCount}/${item.studentCount}`}
          </td>
          <td className="px-3 py-3 whitespace-nowrap text-slate-600">
            {finished
              ? item.finishedAt
                ? new Date(item.finishedAt).toLocaleString()
                : new Date(item.updatedAt).toLocaleString()
              : new Date(item.updatedAt).toLocaleString()}
          </td>
          <td className="px-3 py-3 text-right">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation()
                openLessonRoute(item.id)
              }}
            >
              {finished ? "Results" : "Open"}
            </Button>
          </td>
        </tr>
      ))

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Live lessons</h2>
            <p className="text-sm text-slate-500">
              Open rooms and past sessions. Start a new lesson to pick a book and unit.
            </p>
          </div>
          <Button onClick={startNewLesson}>
            <Plus className="mr-1 h-4 w-4" />
            New lesson
          </Button>
        </div>
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Active &amp; ready</h3>
          </div>
          {openLessons.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No open lessons. Tap New lesson to begin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Group</th>
                    <th className="px-3 py-3 font-semibold">Book</th>
                    <th className="px-3 py-3 font-semibold">Unit</th>
                    <th className="px-3 py-3 font-semibold">Exercise</th>
                    <th className="px-3 py-3 font-semibold">Students</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="px-3 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>{renderRows(openLessons, { finished: false })}</tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <History className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">History</h3>
          </div>
          {pastLessons.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">No finished lessons yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Group</th>
                    <th className="px-3 py-3 font-semibold">Book</th>
                    <th className="px-3 py-3 font-semibold">Unit</th>
                    <th className="px-3 py-3 font-semibold">Exercise</th>
                    <th className="px-3 py-3 font-semibold">Students</th>
                    <th className="px-3 py-3 font-semibold">Finished</th>
                    <th className="px-3 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>{renderRows(pastLessons, { finished: true })}</tbody>
              </table>
            </div>
          )}
        </section>
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
            <Button variant="outline" size="sm" onClick={backToHistory}>
              All lessons
            </Button>
            <Button size="sm" onClick={startNewLesson}>
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
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={backToHistory}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Lessons
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Choose a book</h2>
            <p className="text-sm text-slate-500">
              Then pick a unit. Pages open in the same Cambridge layout as on mobile.
            </p>
          </div>
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
              Open a unit to browse pages like in the book. Assign exercises from each page.
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
                  "overflow-hidden rounded-lg border p-0 text-left transition",
                  u.ready
                    ? "border-[#dce1e6] bg-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-70",
                  isActive && "ring-2 ring-[#3498db]",
                )}
              >
                <div className="flex items-stretch">
                  <div
                    className="flex w-12 shrink-0 items-center justify-center text-xl font-light text-white"
                    style={{ backgroundColor: "#2c3e50" }}
                  >
                    {u.unitNumber}
                  </div>
                  <div className="min-w-0 flex-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-[#2980b9]">
                        Unit {u.unitNumber}
                      </span>
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
                    <h3 className="mt-1 font-semibold text-[#1a1a1a]" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      {u.title}
                    </h3>
                    {u.subtitle && <p className="mt-0.5 text-xs text-[#7f8c8d]">{u.subtitle}</p>}
                    {u.pages && u.pages.length > 0 && (
                      <p className="mt-2 text-xs text-[#2980b9]">
                        pp. {u.pages[0].page}–{u.pages[u.pages.length - 1].page}
                      </p>
                    )}
                  </div>
                </div>
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
    <div className="flex flex-col gap-2 lg:h-[calc(100dvh-5.5rem)] lg:overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-slate-600"
          onClick={() => setView("units")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Units
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            Unit {unitNumber}
            {unitMeta?.title ? `: ${unitMeta.title}` : ""}
            {Number(live?.currentUnit) === Number(unitNumber) && !live?.unitCompleted ? (
              <Badge className="ml-1.5 align-middle bg-emerald-600 hover:bg-emerald-600">Active</Badge>
            ) : null}
          </p>
          <p className="truncate text-[11px] text-slate-500">{bookTitle}</p>
        </div>
        <Select
          value={groupId || undefined}
          onValueChange={setGroupId}
          disabled={Boolean(live) && live.lessonStatus !== "finished"}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue placeholder="Group" />
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
          <Button
            size="sm"
            className="h-8"
            disabled={busy || !groupId}
            onClick={() => void prepareLesson()}
          >
            Prepare
          </Button>
        )}
        {live && live.lessonStatus !== "active" && live.lessonStatus !== "finished" && (
          <Button
            size="sm"
            className="h-8"
            disabled={busy}
            onClick={() => void runAction(() => liveLessonsApi.start(live.id))}
          >
            <Play className="mr-1 h-3.5 w-3.5" />
            Start
          </Button>
        )}
        {live?.lessonStatus === "active" && (
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            disabled={busy}
            onClick={() => setFinishOpen(true)}
          >
            <Square className="mr-1 h-3.5 w-3.5" />
            End lesson
          </Button>
        )}
        {live && (
          <div className="hidden items-center gap-2 text-[11px] text-slate-600 sm:flex">
            {liveExerciseOpen ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                <Radio className="h-3 w-3" />
                Ex {live.currentExercise} · {live.doneCount}/{studentTotal || live.studentCount || 0}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {live.onlineCount}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="min-h-0">
          <CambridgeBookChrome
            className="h-full"
            title={unitMeta?.title || `Unit ${unitNumber}`}
            unit={unitNumber}
            subtitle={unitMeta?.subtitle}
            pageNum={currentPage?.page ?? 0}
            pageIndex={visibleOrdinal}
            pageCount={visiblePageIndexes.length || 1}
            onPrev={goPrevPage}
            onNext={goNextPage}
            canPrev={canPrevPage}
            canNext={canNextPage}
            loading={stepsLoading}
            compact
            fitPage
          >
            {pageIndex === 0 && unitNumber != null ? (
              <CambridgeUnitHeader
                unitNumber={unitNumber}
                title={unitMeta?.title || `Unit ${unitNumber}`}
                subtitle={unitMeta?.subtitle}
              />
            ) : null}
            {sectionBannerTitle ? <CambridgeSectionBanner title={sectionBannerTitle} /> : null}
            {pageSteps.length === 0 && !stepsLoading ? (
              <p className="text-sm text-[#7f8c8d]">No exercises on this page.</p>
            ) : (
              pageSteps.map((step) => {
                const isLiveExercise =
                  Boolean(live?.openForStudents) && live?.currentExercise === step.exerciseId
                const justFinished =
                  !live?.openForStudents &&
                  live?.lastExerciseReview?.exerciseId === step.exerciseId &&
                  Number(live?.lastExerciseReview?.unitNumber) === Number(unitNumber)
                const gradable = isLiveGradableExercise(step)
                const showAssign = canAssignFromThisUnit && gradable && !isLiveExercise
                return (
                  <BookExerciseRenderer
                    key={step.id}
                    step={step}
                    showAnswers={false}
                    variant="cambridge"
                    active={isLiveExercise}
                    actions={
                      showAssign || isLiveExercise || justFinished ? (
                        <>
                          {showAssign ? (
                            <Button
                              size="sm"
                              className="h-7 rounded-full bg-emerald-600 px-3 text-xs font-semibold hover:bg-emerald-700"
                              disabled={busy}
                              onClick={() => void assignExercise(step)}
                            >
                              Assign
                            </Button>
                          ) : null}
                          {isLiveExercise ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full border-emerald-400 px-3 text-xs font-semibold text-emerald-800"
                              disabled={busy}
                              onClick={() => void finishExercise()}
                            >
                              Finish
                            </Button>
                          ) : null}
                          {justFinished && gradable ? (
                            <Badge
                              variant="outline"
                              className="h-7 border-slate-300 px-2 text-[10px] font-semibold text-slate-600"
                            >
                              Results in panel →
                            </Badge>
                          ) : null}
                        </>
                      ) : undefined
                    }
                  />
                )
              })
            )}
          </CambridgeBookChrome>
        </div>

        <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-2 lg:overflow-hidden">
          <p className="mb-2 shrink-0 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Students
            {liveExerciseOpen ? (
              <span className="ml-1 font-normal normal-case text-emerald-700">· {donePct}% done</span>
            ) : null}
          </p>
          {!live && (
            <p className="px-1 text-xs text-slate-500">Prepare a lesson to track live progress.</p>
          )}
          {live && (
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
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
                      "w-full rounded-lg border px-2 py-1.5 text-left transition hover:shadow-sm",
                      isDone
                        ? "border-emerald-200 bg-emerald-50/70"
                        : "border-slate-100 bg-slate-50/60 hover:border-slate-200",
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            isOnline ? "bg-emerald-500" : "bg-slate-300",
                          )}
                        />
                        <p className="truncate text-xs font-medium text-slate-900">{s.name}</p>
                      </div>
                      {scorePct != null ? (
                        <span
                          className="rounded px-1 py-0.5 text-[10px] font-bold tabular-nums text-white"
                          style={{ backgroundColor: scoreBarColor(scorePct) }}
                        >
                          {scorePct}%
                        </span>
                      ) : isDone ? (
                        <Badge className="h-5 bg-emerald-600 px-1 text-[9px] hover:bg-emerald-600">
                          Done
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${barPct}%`,
                          backgroundColor:
                            scorePct != null ? scoreBarColor(scorePct) : "transparent",
                        }}
                      />
                    </div>
                  </button>
                )
              })}
              {(live.students ?? []).length === 0 && (
                <p className="text-xs text-slate-500">No students in this group.</p>
              )}
            </div>
          )}
          {!live && groupId && (
            <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
              {students
                .filter((s) => s.groupId === groupId)
                .map((s) => (
                  <li key={s.id} className="rounded-lg px-2 py-1 text-xs text-slate-600">
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
