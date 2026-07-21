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

export interface SpeakingRubricDraft {
  grammarScore: string
  vocabularyScore: string
  fluencyScore: string
  pronunciationScore: string
}

export const EMPTY_SPEAKING_RUBRIC: SpeakingRubricDraft = {
  grammarScore: "",
  vocabularyScore: "",
  fluencyScore: "",
  pronunciationScore: "",
}

const SPEAKING_RUBRIC_CRITERIA = [
  { key: "grammarScore" as const, label: "Grammar" },
  { key: "vocabularyScore" as const, label: "Vocabulary" },
  { key: "fluencyScore" as const, label: "Fluency" },
  { key: "pronunciationScore" as const, label: "Pronunciation" },
]

function speakingRecordings(mistakes: HomeworkMistake[]): HomeworkMistake[] {
  return mistakes.filter((m) => /^https?:\/\//i.test(m.userAnswer))
}

export function recordingGradesFromMistakes(mistakes: HomeworkMistake[]): RecordingGradeDraft[] {
  return speakingRecordings(mistakes).map((m) => ({
    questionId: m.questionId,
    feedback: m.feedback ?? "",
  }))
}

export function speakingRubricFromMistakes(mistakes: HomeworkMistake[]): SpeakingRubricDraft {
  const source = speakingRecordings(mistakes).find(
    (m) =>
      m.grammarScore != null ||
      m.vocabularyScore != null ||
      m.fluencyScore != null ||
      m.pronunciationScore != null,
  )
  if (!source) return { ...EMPTY_SPEAKING_RUBRIC }
  return {
    grammarScore: source.grammarScore != null ? String(source.grammarScore) : "",
    vocabularyScore: source.vocabularyScore != null ? String(source.vocabularyScore) : "",
    fluencyScore: source.fluencyScore != null ? String(source.fluencyScore) : "",
    pronunciationScore:
      source.pronunciationScore != null ? String(source.pronunciationScore) : "",
  }
}

export function parseSpeakingRubric(
  rubric: SpeakingRubricDraft,
): {
  grammarScore: number
  vocabularyScore: number
  fluencyScore: number
  pronunciationScore: number
} | null {
  const parsed = SPEAKING_RUBRIC_CRITERIA.map(({ key }) => {
    const raw = rubric[key].trim()
    if (!raw) return null
    const n = Number(raw.replace(",", "."))
    if (Number.isNaN(n) || n < 1 || n > 10) return null
    return n
  })
  if (parsed.some((v) => v == null)) return null
  return {
    grammarScore: parsed[0]!,
    vocabularyScore: parsed[1]!,
    fluencyScore: parsed[2]!,
    pronunciationScore: parsed[3]!,
  }
}

export function speakingRubricAverageFromMistakes(mistakes: HomeworkMistake[]): number | null {
  const rubric = parseSpeakingRubric(speakingRubricFromMistakes(mistakes))
  if (!rubric) return null
  const values = [
    rubric.grammarScore,
    rubric.vocabularyScore,
    rubric.fluencyScore,
    rubric.pronunciationScore,
  ]
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function SpeakingRubricField({
  value,
  onChange,
}: {
  value: SpeakingRubricDraft
  onChange: (next: SpeakingRubricDraft) => void
}) {
  const average = parseSpeakingRubric(value)
  const averageScore = average
    ? (average.grammarScore +
        average.vocabularyScore +
        average.fluencyScore +
        average.pronunciationScore) /
      4
    : null

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          Final speaking assessment
        </label>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Rate each criterion from 1 to 10. These scores feed the student language profile.
        </p>
      </div>

      <div className="space-y-3">
        {SPEAKING_RUBRIC_CRITERIA.map(({ key, label }) => {
          const selected = value[key].trim() ? Number(value[key]) : null
          return (
            <div key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700">{label}</span>
                {selected != null && !Number.isNaN(selected) ? (
                  <span className="text-xs font-bold tabular-nums text-emerald-700">{selected}/10</span>
                ) : (
                  <span className="text-xs text-slate-400">Not set</span>
                )}
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const active = selected === n
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onChange({ ...value, [key]: String(n) })}
                      className={cn(
                        "rounded-md border py-1.5 text-center text-xs font-semibold tabular-nums transition-colors",
                        active
                          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {averageScore != null ? (
        <p className="text-xs text-slate-600">
          Overall average:{" "}
          <span className="font-semibold tabular-nums text-slate-900">
            {averageScore.toFixed(1)}/10
          </span>
        </p>
      ) : (
        <p className="text-xs text-slate-400">Select a score for each criterion to complete grading</p>
      )}
    </div>
  )
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
