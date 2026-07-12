"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { CheckCircle2, Loader2, Radio } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookExerciseRenderer } from "@/components/admin/live-lesson/book-exercise-renderer"
import { fetchLessonSteps } from "@/lib/books/catalog"
import type { LessonStep, LiveLessonState } from "@/lib/books/types"
import { liveLessonsApi } from "@/lib/live-lessons-api"
import { useLiveLessonSocket } from "@/lib/use-live-lesson-socket"
import { CardGridSkeleton } from "@/components/admin/skeletons"

export default function StudentLiveLessonPage() {
  const params = useParams<{ code: string }>()
  const code = String(params.code ?? "").toUpperCase()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [live, setLive] = useState<LiveLessonState | null>(null)
  const [steps, setSteps] = useState<LessonStep[]>([])
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [localProgress, setLocalProgress] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/login?next=${encodeURIComponent(`/live/${code}`)}`)
    }
  }, [authLoading, user, router, code])

  useEffect(() => {
    if (!user || user.type !== "student") return
    let cancelled = false
    ;(async () => {
      setJoining(true)
      setError(null)
      try {
        const session = await liveLessonsApi.joinByCode(code)
        const joined = await liveLessonsApi.join(session.id)
        if (!cancelled) setLive(joined)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not join lesson")
      } finally {
        if (!cancelled) setJoining(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, code])

  // Load unit content from DB API (answers stripped for students)
  useEffect(() => {
    if (!live?.bookId || live.currentUnit == null) {
      setSteps([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const flow = await fetchLessonSteps(live.bookId, live.currentUnit!)
        if (!cancelled) setSteps(flow)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load exercise")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [live?.bookId, live?.currentUnit])

  const onState = useCallback((state: LiveLessonState) => {
    setLive(state)
    setLocalProgress(0)
  }, [])

  const { connected, emit } = useLiveLessonSocket(live?.id ?? null, { onState }, {
    role: "student",
    joinCode: code,
  })

  // Socket-only heartbeat every 30s — no parallel REST spam
  useEffect(() => {
    if (!live?.id || !connected) return
    const tick = () => emit("lesson:heartbeat", { sessionId: live.id })
    tick()
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [live?.id, connected, emit])

  const currentStep = steps.find((s) => s.exerciseId === live?.currentExercise) ?? null
  const me = live?.students?.find((s) => s.studentId === user?.id)

  const markWorking = async (progress: number) => {
    if (!live) return
    setLocalProgress(progress)
    setSubmitting(true)
    try {
      // Prefer socket (single path); REST fallback if socket down
      if (connected) {
        emit("lesson:progress", {
          sessionId: live.id,
          progress,
          status: progress >= 100 ? "done" : "working",
          score: progress >= 100 ? Math.round(progress) : null,
        })
      } else {
        const next = await liveLessonsApi.progress(live.id, {
          progress,
          status: progress >= 100 ? "done" : "working",
          score: progress >= 100 ? Math.round(progress) : null,
        })
        setLive(next)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update progress")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || joining) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <CardGridSkeleton count={2} columns={2} />
      </div>
    )
  }

  if (user && user.type !== "student") {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-slate-700">
          Live lesson join is for students. Teachers use Admin → Live lessons.
        </p>
        <Button className="mt-4" onClick={() => router.push("/admin/lessons")}>
          Open Live lessons
        </Button>
      </div>
    )
  }

  if (error && !live) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-rose-700">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => router.refresh()}>
          Retry
        </Button>
      </div>
    )
  }

  const open = Boolean(live?.openForStudents && live.lessonStatus === "active")

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <header className="border-b border-sky-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Live lesson</p>
            <h1 className="text-lg font-semibold text-slate-900">Code {code}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={connected ? "secondary" : "outline"}>
              {connected ? "Connected" : "Connecting…"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {live?.lessonStatus ?? "…"}
            </Badge>
            {live?.currentExercise && <Badge variant="outline">Ex {live.currentExercise}</Badge>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        )}

        {!open && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-sky-600" />
            <p className="mt-4 font-medium text-slate-900">Waiting for teacher</p>
            <p className="mt-1 text-sm text-slate-500">
              The teacher will open an exercise for the class. Stay on this page.
            </p>
            {me && (
              <p className="mt-3 text-xs text-slate-400">
                You are {me.status} · progress {me.progress}%
              </p>
            )}
          </div>
        )}

        {open && currentStep && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="gap-1 bg-emerald-600">
                <Radio className="h-3 w-3" />
                Open for students
              </Badge>
              <span className="text-sm text-slate-500">Unit {live?.currentUnit}</span>
            </div>
            <BookExerciseRenderer step={currentStep} showAnswers={false} />
            <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button
                variant="outline"
                disabled={submitting}
                onClick={() => void markWorking(Math.min(90, localProgress + 25))}
              >
                I&apos;m working ({Math.min(90, localProgress + 25)}%)
              </Button>
              <Button disabled={submitting} onClick={() => void markWorking(100)}>
                <CheckCircle2 className="mr-1 h-4 w-4" />
                Mark complete
              </Button>
            </div>
          </div>
        )}

        {open && !currentStep && (
          <p className="text-sm text-slate-500">Exercise content is not available for this step yet.</p>
        )}
      </main>
    </div>
  )
}
