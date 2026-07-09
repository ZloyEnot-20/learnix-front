"use client"

import { AlertTriangle, Lightbulb, MessageSquare } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { SpeakingAudioPlayer } from "@/components/speaking-audio-player"
import type { HomeworkMistake } from "@/lib/admin-storage"
import { cn } from "@/lib/utils"

export interface RecordingGradeDraft {
  questionId: number
  feedback: string
}

export function recordingGradesFromMistakes(mistakes: HomeworkMistake[]): RecordingGradeDraft[] {
  return mistakes
    .filter((m) => /^https?:\/\//i.test(m.userAnswer))
    .map((m) => ({
      questionId: m.questionId,
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

        <div>
          <label className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <MessageSquare className="h-3 w-3" />
            Feedback for this recording
          </label>
          <Textarea
            value={grade.feedback}
            onChange={(e) => onChange({ feedback: e.target.value })}
            placeholder="Notes about pronunciation, fluency, vocabulary…"
            rows={3}
            className="mt-1 min-h-[96px] resize-y text-sm"
          />
        </div>
      </div>
    </li>
  )
}
