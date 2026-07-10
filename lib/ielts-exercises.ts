import type { LucideIcon } from "lucide-react"
import { BookOpen, Headphones, Mic, PenLine } from "lucide-react"
import type { IeltsReadingSummary } from "./reading-data"
import type { IeltsListeningSummary } from "./listening-data"

export const IELTS_LEVEL_KEY = "ielts"

export const IELTS_LEVEL = {
  key: IELTS_LEVEL_KEY,
  label: "IELTS",
} as const

export const IELTS_LEVEL_PALETTE = "bg-indigo-100 text-indigo-700"

export interface IeltsSubjectFolder {
  id: "reading" | "listening" | "speaking" | "writing"
  label: string
  icon: LucideIcon
  cls: string
}

/** Skill folders inside the top-level IELTS folder. */
export const IELTS_SUBJECT_FOLDERS: IeltsSubjectFolder[] = [
  { id: "reading", label: "Reading", icon: BookOpen, cls: "bg-sky-100 text-sky-700" },
  { id: "listening", label: "Listening", icon: Headphones, cls: "bg-amber-100 text-amber-800" },
  { id: "speaking", label: "Speaking", icon: Mic, cls: "bg-rose-100 text-rose-700" },
  { id: "writing", label: "Writing", icon: PenLine, cls: "bg-emerald-100 text-emerald-700" },
]

export function isIeltsLevel(level: string | null | undefined): boolean {
  return level === IELTS_LEVEL_KEY
}

export function ieltsFolderStats(
  readings: IeltsReadingSummary[],
  listenings: IeltsListeningSummary[] = [],
): {
  sectionCount: number
  passageCount: number
  questionCount: number
} {
  const passageCount = readings.length + listenings.length
  const questionCount =
    readings.reduce((sum, r) => sum + r.questionCount, 0) +
    listenings.reduce((sum, t) => sum + t.questionCount, 0)
  return {
    sectionCount: IELTS_SUBJECT_FOLDERS.length,
    passageCount,
    questionCount,
  }
}

export function ieltsCategoryStats(
  categoryId: string,
  readings: IeltsReadingSummary[],
  listenings: IeltsListeningSummary[] = [],
): { count: number; lines: string[] } {
  if (categoryId === "reading") {
    return {
      count: readings.length,
      lines: [
        `${readings.length} passage${readings.length === 1 ? "" : "s"}`,
        "IELTS-style questions",
      ],
    }
  }
  if (categoryId === "listening") {
    const books = new Set(listenings.map((item) => item.book).filter(Boolean))
    return {
      count: listenings.length,
      lines: [
        `${listenings.length} test${listenings.length === 1 ? "" : "s"}`,
        books.size > 0 ? `Books ${Math.min(...books)}–${Math.max(...books)}` : "40 questions each",
      ],
    }
  }
  return { count: 0, lines: [] }
}
