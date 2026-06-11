"use client"

import { Award, AlertTriangle, Lightbulb, MessageSquare } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SpeakingAudioPlayer } from "@/components/speaking-audio-player"
import type { HomeworkMistake } from "@/lib/admin-storage"
import { cn } from "@/lib/utils"

export interface RecordingGradeDraft {
  questionId: number
  score: string
  feedback: string
}

export function recordingGradesFromMistakes(mistakes: HomeworkMistake[]): RecordingGradeDraft[] {
  return mistakes
    .filter((m) => /^https?:\/\//i.test(m.userAnswer))
    .map((m) => ({
      questionId: m.questionId,
      score: m.score != null ? String(m.score) : "",
      feedback: m.feedback ?? "",
    }))
}

export function SpeakingRecordingReviewCard({
  mistake,
  grade,
  index,
  onChange,
}: {
  mistake: HomeworkMistake
  grade: RecordingGradeDraft
  index: number
  onChange: (patch: Partial<RecordingGradeDraft>) => void
}) {
  const parsedScore = grade.score.trim() ? Number(grade.score.replace(",", ".")) : null
  const hint = mistake.correctAnswer || mistake.explanation

  return (
    <li className="overflow-hidden rounded-xl border border-sky-100/80 bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-sky-50 bg-gradient-to-r from-sky-50/80 to-white px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-bold text-sky-800">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-slate-900">{mistake.prompt}</p>
          {hint ? (
            <p className="mt-1 inline-flex items-start gap-1 text-[11px] text-slate-500">
              <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
              {hint}
            </p>
          ) : null}
        </div>
        {parsedScore != null && !Number.isNaN(parsedScore) ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
              bandClass(parsedScore),
            )}
          >
            <Award className="h-3 w-3" />
            {parsedScore.toFixed(1)}
          </span>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-3">
        <SpeakingAudioPlayer src={mistake.userAnswer} />

        {mistake.transcription ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Transcription
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-800">{mistake.transcription}</p>
            <p className="mt-2 inline-flex items-start gap-1 text-[11px] text-amber-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              Auto-generated text may be inaccurate — always listen to the recording.
            </p>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400 italic">
            Transcription pending or unavailable — refresh after a moment.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Score (0–9)
            </label>
            <Input
              value={grade.score}
              onChange={(e) => onChange({ score: e.target.value })}
              placeholder="6.5"
              className="mt-1 h-9"
            />
          </div>
          <div>
            <label className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <MessageSquare className="h-3 w-3" />
              Feedback
            </label>
            <Textarea
              value={grade.feedback}
              onChange={(e) => onChange({ feedback: e.target.value })}
              placeholder="Pronunciation, fluency, vocabulary…"
              rows={2}
              className="mt-1 min-h-[72px] resize-y text-sm"
            />
          </div>
        </div>
      </div>
    </li>
  )
}

function bandClass(score: number): string {
  if (score >= 7) return "bg-emerald-100 text-emerald-800"
  if (score >= 5.5) return "bg-sky-100 text-sky-800"
  if (score >= 4) return "bg-amber-100 text-amber-800"
  return "bg-rose-100 text-rose-800"
}
