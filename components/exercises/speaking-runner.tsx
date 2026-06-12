"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronRight,
  CloudUpload,
  Lightbulb,
  Loader2,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Square,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { uploadsApi, analyticsApi, homeworkApi } from "@/lib/api"
import { invalidateMyHomework } from "@/lib/homework-cache"
import type { GrammarExercise, GrammarQuestion } from "@/lib/grammar-types"
import { cn } from "@/lib/utils"

type SpeakingResponse = {
  id: number
  prompt: string
  audioUrl: string
  explanation?: string
}

export interface SpeakingRunnerProps {
  exercise: GrammarExercise
  backHref: string
  homeworkId?: string
  studentId?: string
  timeLimitMinutes?: number
  sessionStartedAt: number
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

function SpeakingResults({
  exercise,
  responses,
  backHref,
  homeworkId,
  studentId,
  startedAt,
}: {
  exercise: GrammarExercise
  responses: SpeakingResponse[]
  backHref: string
  homeworkId?: string
  studentId?: string
  startedAt: number
}) {
  const recorded = useRef(false)
  const total = exercise.totalQuestions
  const answered = responses.length
  const elapsedMs = Date.now() - startedAt

  useEffect(() => {
    if (recorded.current) return
    recorded.current = true

    const attemptPayload = {
      totalQuestions: total,
      correctCount: answered,
      durationSeconds: Math.round(elapsedMs / 1000),
      answeredCount: answered,
      mistakes: responses.map((r) => ({
        questionId: r.id,
        prompt: r.prompt,
        userAnswer: r.audioUrl,
        correctAnswer: "",
        explanation: r.explanation,
      })),
    }

    void analyticsApi
      .record({
        topic: exercise.topic,
        subtopic: exercise.subtopic,
        slug: exercise.slug,
        title: exercise.title,
        type: exercise.type,
        correctCount: answered,
        totalQuestions: total,
        source: homeworkId ? "homework" : "game",
        homeworkId,
        studentId,
      })
      .catch(() => {})

    if (homeworkId && studentId) {
      void homeworkApi
        .recordAttempt(homeworkId, attemptPayload)
        .then(() => invalidateMyHomework())
        .catch(() => {})
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <SpeakingHeader exercise={exercise} backHref={backHref} hideBack={!!homeworkId} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="overflow-hidden">
          <div className="h-1.5 w-full bg-sky-500" />
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Mic className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {homeworkId ? "Speaking submitted" : "Practice complete"}
              </h2>
              <p className="text-sm text-slate-500">
                {answered}/{total} recordings {homeworkId ? "sent" : "saved"}
              </p>
              {homeworkId && (
                <p className="text-sm text-slate-500">
                  Your teacher will listen and grade your answers.
                </p>
              )}
              <Link href={homeworkId ? "/dashboard" : backHref} className="mt-4">
                <Button className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  <ArrowLeft className="h-4 w-4" />
                  {homeworkId ? "Back to dashboard" : "Back to topic"}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SpeakingRunner({
  exercise,
  backHref,
  homeworkId,
  studentId,
  sessionStartedAt,
}: SpeakingRunnerProps) {
  const questions = exercise.content.questions ?? []
  const [index, setIndex] = useState(0)
  const [responses, setResponses] = useState<SpeakingResponse[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recorder = useAudioRecorder()

  const q: GrammarQuestion | undefined = questions[index]
  const finished = index >= questions.length

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current = null
    }
    setPlaying(false)
  }, [])

  useEffect(() => {
    stopPlayback()
    void recorder.reset()
    // Only re-run when advancing to the next question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const playRecording = useCallback(() => {
    if (!recorder.objectUrl) return
    if (playing) {
      stopPlayback()
      return
    }
    const audio = new Audio(recorder.objectUrl)
    audio.onended = () => setPlaying(false)
    audioRef.current = audio
    setPlaying(true)
    void audio.play().catch(() => setPlaying(false))
  }, [playing, recorder.objectUrl, stopPlayback])

  const handleRecordToggle = useCallback(async () => {
    if (recorder.isRecording) {
      recorder.pause()
      return
    }
    if (recorder.isPaused) {
      recorder.resume()
      return
    }
    stopPlayback()
    await recorder.start()
  }, [recorder, stopPlayback])

  const handleStop = useCallback(async () => {
    await recorder.stop()
  }, [recorder])

  const handleReRecord = useCallback(async () => {
    stopPlayback()
    await recorder.reset()
  }, [recorder, stopPlayback])

  const handleSubmitAnswer = useCallback(async () => {
    if (!q) return
    setUploading(true)
    setUploadError(null)
    try {
      let blob = recorder.blob
      if (recorder.isRecording || recorder.isPaused) {
        blob = await recorder.stop()
      }
      if (!blob) return

      const { url } = await uploadsApi.speakingAudio(blob)
      setResponses((prev) => [
        ...prev,
        {
          id: q.id,
          prompt: q.text,
          audioUrl: url,
          explanation: q.explanation,
        },
      ])
      stopPlayback()
      await recorder.reset()
      setIndex((i) => i + 1)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }, [q, recorder, stopPlayback])

  const recordButtonLabel = useMemo(() => {
    if (recorder.isRecording) return "Pause"
    if (recorder.isPaused) return "Resume"
    return "Record"
  }, [recorder.isRecording, recorder.isPaused])

  if (finished) {
    return (
      <SpeakingResults
        exercise={exercise}
        responses={responses}
        backHref={backHref}
        homeworkId={homeworkId}
        studentId={studentId}
        startedAt={sessionStartedAt}
      />
    )
  }

  if (!q) return null

  const progressPct = Math.round((index / questions.length) * 100)
  const canSubmit = recorder.hasRecording && !uploading

  return (
    <div className="min-h-screen bg-slate-50">
      <SpeakingHeader exercise={exercise} backHref={backHref} hideBack={!!homeworkId} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <p className="font-medium text-slate-900">
            Question {index + 1} of {questions.length}
          </p>
          <p className="text-slate-500">
            <span className="font-semibold text-slate-900 tabular-nums">{responses.length}</span>{" "}
            submitted
          </p>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <Card className="overflow-hidden">
          <CardContent className="pt-6 pb-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Question {index + 1}</h2>
            <p className="text-lg leading-relaxed text-slate-900">{q.text}</p>
            {q.prepTimeSeconds ? (
              <p className="text-xs text-slate-500">
                Prep: {q.prepTimeSeconds}s · Speak up to {q.speakTimeSeconds ?? 60}s
              </p>
            ) : null}

            <HintRow showHint={showHint} setShowHint={setShowHint} hint={q.hint} />

            {recorder.error ? (
              <p className="text-sm text-rose-600">{recorder.error}</p>
            ) : null}
            {uploadError ? <p className="text-sm text-rose-600">{uploadError}</p> : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    recorder.isRecording && "bg-sky-500 animate-pulse",
                    recorder.isPaused && "bg-amber-500",
                    !recorder.isRecording && !recorder.isPaused && "bg-slate-300",
                  )}
                />
                <span className="text-sm text-slate-600">
                  {recorder.isRecording
                    ? "Recording…"
                    : recorder.isPaused
                      ? "Paused"
                      : recorder.hasRecording
                        ? `Recorded ${formatDuration(recorder.durationMs)}`
                        : "Click Record to start"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={recorder.isRecording || recorder.isPaused ? "default" : "outline"}
                  onClick={handleRecordToggle}
                  disabled={uploading || recorder.hasRecording}
                  className={cn(
                    "gap-2",
                    (recorder.isRecording || recorder.isPaused) &&
                      "bg-sky-500 hover:bg-sky-600 text-white",
                  )}
                >
                  {recorder.isRecording ? (
                    <Pause className="h-4 w-4" />
                  ) : recorder.isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {recordButtonLabel}
                </Button>

                {(recorder.isRecording || recorder.isPaused) && (
                  <Button type="button" variant="outline" onClick={handleStop} className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                )}

                {recorder.hasRecording && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={playRecording}
                      className="gap-2"
                    >
                      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {playing ? "Stop" : "Listen"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReRecord}
                      className="gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Re-record
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center pt-1">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!canSubmit}
                className="gap-2 bg-primary hover:bg-primary/90 disabled:bg-primary/30"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
                {index + 1 >= questions.length ? "Submit final answer" : "Submit & next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SpeakingHeader({
  exercise,
  backHref,
  hideBack,
}: {
  exercise: GrammarExercise
  backHref: string
  hideBack?: boolean
}) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        {!hideBack && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to topic
          </Link>
        )}
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{exercise.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{exercise.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>
            Level: <span className="font-semibold text-slate-700">{exercise.level}</span>
          </span>
          <span>
            Prompts:{" "}
            <span className="font-semibold text-slate-700">{exercise.totalQuestions}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function HintRow({
  showHint,
  setShowHint,
  hint,
}: {
  showHint: boolean
  setShowHint: (fn: (v: boolean) => boolean) => void
  hint?: string
}) {
  if (!hint) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setShowHint((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
          showHint
            ? "border-amber-300 bg-amber-100 text-amber-900"
            : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
        )}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        hint
        <ChevronRight
          className={cn("h-3.5 w-3.5 transition-transform", showHint && "rotate-90")}
        />
      </button>
      {showHint && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
          {hint}
        </p>
      )}
    </div>
  )
}
